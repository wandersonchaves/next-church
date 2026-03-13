'use server';

import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { journeyHistory, memberJourneys, members } from '@/models/Schema';
import { MemberSchema, StepCompletionSchema } from '@/validations/MemberValidation';

/**
 * Adiciona um novo membro validando o limite do G12 e construindo a linhagem.
 * @param data
 */
export async function createMemberAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Organization required' };
  }

  const validated = MemberSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.format() };
  }

  try {
    return await db.transaction(async (tx) => {
      let lineage = '';
      const { leaderId } = validated.data;

      if (leaderId) {
        // 1. Validar se o líder já tem 12 discípulos
        const [disciplesCount] = await tx
          .select({ value: count() })
          .from(members)
          .where(and(eq(members.leaderId, leaderId), eq(members.organizationId, orgId)));

        if (disciplesCount && disciplesCount.value >= 12) {
          return { error: 'Este líder já atingiu o limite de 12 discípulos (G12).' };
        }

        // 2. Buscar a linhagem do líder para compor a do novo membro
        const [leader] = await tx
          .select({ lineage: members.lineage })
          .from(members)
          .where(eq(members.id, leaderId));

        lineage = leader?.lineage ? `${leader.lineage}.${leaderId}` : leaderId;
      }

      // 3. Inserir o membro
      const [newMember] = await tx.insert(members).values({
        ...validated.data,
        organizationId: orgId,
        leaderId: leaderId || null,
        lineage,
        birthDate: new Date(validated.data.birthDate),
        generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
      }).returning();

      revalidatePath('/[locale]/dashboard', 'layout');
      return { success: true, data: newMember };
    });
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao salvar membro no banco de dados.' };
  }
}

/**
 * Registra a conclusão de um passo da jornada com auditoria.
 * @param data
 */
export async function completeJourneyStepAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Unauthorized' };
  }

  const validated = StepCompletionSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid data' };
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Buscar membro atual para log de auditoria
      const [member] = await tx
        .select()
        .from(members)
        .where(and(eq(members.id, validated.data.memberId), eq(members.organizationId, orgId)));

      if (!member) {
        return { error: 'Member not found' };
      }

      // 2. Registrar na tabela de jornadas concluídas
      await tx.insert(memberJourneys).values({
        organizationId: orgId,
        memberId: validated.data.memberId,
        step: validated.data.step,
        notes: validated.data.notes,
        // Em um sistema real, buscaríamos o UUID do membro que o ClerkUserId representa
        // Aqui usamos null por simplicidade de domínio inicial
        validatedById: null,
      });

      // 3. Atualizar status atual no perfil do membro
      await tx.update(members)
        .set({ currentStep: validated.data.step, updatedAt: new Date() })
        .where(eq(members.id, validated.data.memberId));

      // 4. Log histórico
      await tx.insert(journeyHistory).values({
        memberId: validated.data.memberId,
        oldStep: member.currentStep,
        newStep: validated.data.step,
        notes: validated.data.notes,
      });

      revalidatePath('/[locale]/dashboard', 'layout');
      return { success: true };
    });
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao progredir jornada.' };
  }
}
