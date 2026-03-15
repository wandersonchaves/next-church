'use server';

import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
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
        const [disciplesCount] = await tx
          .select({ value: count() })
          .from(members)
          .where(and(eq(members.leaderId, leaderId), eq(members.organizationId, orgId)));

        if (disciplesCount && disciplesCount.value >= 12) {
          return { error: 'Este líder já atingiu o limite de 12 discípulos (G12).' };
        }

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

      // 4. Disparar Boas-vindas Assíncrona
      if (newMember) {
        await inngest.send({
          name: 'member/created',
          data: {
            memberId: newMember.id,
            organizationId: orgId,
          },
        });
      }

      revalidatePath('/[locale]/dashboard', 'layout');
      return { success: true, data: newMember };
    });
  } catch (e) {
    console.error('[CREATE_MEMBER_ERROR]', e);
    return { error: 'Falha ao salvar membro.' };
  }
}

/**
 * Registra a conclusão de um passo da jornada com auditoria resiliente.
 * @param data
 */
export async function completeJourneyStepAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Unauthorized' };
  }

  const validated = StepCompletionSchema.safeParse(data);
  if (!validated.success) {
    console.warn('[STEP_VALIDATION_ERROR]', validated.error.format());
    return { error: 'Dados de transição inválidos' };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Buscar membro atual
      const [member] = await tx
        .select()
        .from(members)
        .where(and(eq(members.id, validated.data.memberId), eq(members.organizationId, orgId)));

      if (!member) {
        return { error: 'Membro não encontrado' };
      }

      // 2. Registrar conclusão do passo
      await tx.insert(memberJourneys).values({
        organizationId: orgId,
        memberId: validated.data.memberId,
        step: validated.data.step,
        notes: validated.data.notes || `Progredido para ${validated.data.step}`,
      });

      // 3. Atualizar status no perfil
      await tx.update(members)
        .set({ currentStep: validated.data.step, updatedAt: new Date() })
        .where(eq(members.id, validated.data.memberId));

      // 4. Histórico de auditoria
      await tx.insert(journeyHistory).values({
        memberId: validated.data.memberId,
        oldStep: member.currentStep,
        newStep: validated.data.step,
        notes: validated.data.notes,
      });

      return { success: true };
    });

    // 5. Disparar Inngest FORA da transação para não travar o banco se a fila falhar
    if (result.success) {
      try {
        await inngest.send({
          name: 'member/step.completed',
          data: {
            memberId: validated.data.memberId,
            organizationId: orgId,
            newStep: validated.data.step,
          },
        });
      } catch (inngestErr) {
        console.warn('[INNGEST_SEND_WARN] Fila offline, mas banco atualizado.', inngestErr);
      }

      revalidatePath('/[locale]/dashboard', 'layout');
    }

    return result;
  } catch (e) {
    console.error('[JOURNEY_PROGRESS_ERROR]', e);
    return { error: 'Erro interno no servidor ao processar jornada.' };
  }
}
