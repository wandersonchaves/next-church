'use server';

import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
import { journeyHistory, memberJourneys, members } from '@/models/Schema';
import { MemberSchema, StepCompletionSchema } from '@/validations/MemberValidation';
import { logActivity } from '@/libs/services/AuditService';

/**
 * Adiciona um novo integrante com resiliência a falhas de side-effects (Inngest/Audit).
 */
export async function createMemberAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Organization required' };

  const validated = MemberSchema.safeParse(data);
  if (!validated.success) return { error: 'Dados inválidos ou incompletos.' };

  let createdMember = null;

  try {
    // 1. Transação Pura de Banco de Dados
    createdMember = await db.transaction(async (tx) => {
      let lineage = '';
      const { leaderId } = validated.data;

      if (leaderId) {
        const [leader] = await tx
          .select({ lineage: members.lineage })
          .from(members)
          .where(eq(members.id, leaderId))
          .limit(1);
        lineage = leader?.lineage ? `${leader.lineage}.${leaderId}` : leaderId;
      }

      const [newMember] = await tx.insert(members).values({
        organizationId: orgId,
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        birthDate: new Date(validated.data.birthDate),
        gender: validated.data.gender,
        leaderId: leaderId || null,
        lineage: lineage,
        generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
        isBaptized: validated.data.isBaptized || false,
        currentStep: validated.data.currentStep || 'DECISION',
      }).returning();

      return newMember;
    });

    // 2. Side-effects FORA da transação (Se falhar, o membro já está salvo)
    if (createdMember) {
      try {
        await logActivity('CREATE', 'MEMBER', `${createdMember.firstName} ${createdMember.lastName}`);
        await inngest.send({
          name: 'member/created',
          data: { memberId: createdMember.id, organizationId: orgId }
        });
      } catch (sideEffectErr) {
        const errorMessage = sideEffectErr instanceof Error ? sideEffectErr.message : 'Unknown error';
        console.warn('[SIDE_EFFECT_WARN] Registro salvo, mas auditoria/inngest falhou:', errorMessage);
      }
    }

    revalidatePath('/[locale]/dashboard', 'layout');
    return { success: true, data: createdMember };

  } catch (e) {
    console.error('[DATABASE_ERROR]', e);
    return { error: 'Erro ao salvar no banco de dados. Tente novamente.' };
  }
}

/**
 * Atualiza um membro com resiliência.
 */
export async function updateMemberAction(memberId: string, data: any) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Unauthorized' };

  const validated = MemberSchema.safeParse(data);
  if (!validated.success) return { error: 'Dados inválidos' };

  try {
    await db.transaction(async (tx) => {
      const [currentMember] = await tx.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!currentMember) throw new Error("Membro não encontrado");

      let newLineage = currentMember.lineage;
      if (validated.data.leaderId !== currentMember.leaderId) {
        if (validated.data.leaderId) {
          const [leader] = await tx.select({ lineage: members.lineage }).from(members).where(eq(members.id, validated.data.leaderId)).limit(1);
          newLineage = leader?.lineage ? `${leader.lineage}.${validated.data.leaderId}` : validated.data.leaderId;
        } else {
          newLineage = '';
        }
      }

      await tx.update(members)
        .set({
          firstName: validated.data.firstName,
          lastName: validated.data.lastName,
          email: validated.data.email || null,
          phone: validated.data.phone || null,
          birthDate: new Date(validated.data.birthDate),
          gender: validated.data.gender,
          leaderId: validated.data.leaderId || null,
          lineage: newLineage,
          generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
          isBaptized: validated.data.isBaptized,
          updatedAt: new Date(),
        })
        .where(and(eq(members.id, memberId), eq(members.organizationId, orgId)));
    });

    // Auditoria fora da transação
    await logActivity('UPDATE', 'MEMBER', `${validated.data.firstName} ${validated.data.lastName}`).catch(() => { });

    revalidatePath('/[locale]/dashboard', 'layout');
    return { success: true };
  } catch (e) {
    console.error('[UPDATE_ERROR]', e);
    return { error: 'Falha ao atualizar registro.' };
  }
}

export async function deleteMemberAction(memberId: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Unauthorized' };
  try {
    const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    await db.delete(members).where(and(eq(members.id, memberId), eq(members.organizationId, orgId)));
    if (member) await logActivity('DELETE', 'MEMBER', `${member.firstName} ${member.lastName}`).catch(() => { });
    revalidatePath('/[locale]/dashboard', 'layout');
    return { success: true };
  } catch (e) {
    return { error: 'Falha ao excluir membro.' };
  }
}

export async function completeJourneyStepAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Unauthorized' };
  const validated = StepCompletionSchema.safeParse(data);
  if (!validated.success) return { error: 'Dados inválidos' };

  try {
    const result = await db.transaction(async (tx) => {
      const [member] = await tx.select().from(members).where(and(eq(members.id, validated.data.memberId), eq(members.organizationId, orgId)));
      if (!member) return { error: 'Membro não encontrado' };
      await tx.insert(memberJourneys).values({ organizationId: orgId, memberId: validated.data.memberId, step: validated.data.step, notes: validated.data.notes || `Progredido para ${validated.data.step}` });
      await tx.update(members).set({ currentStep: validated.data.step, updatedAt: new Date() }).where(eq(members.id, validated.data.memberId));
      await tx.insert(journeyHistory).values({ memberId: validated.data.memberId, oldStep: member.currentStep, newStep: validated.data.step, notes: validated.data.notes });
      return { success: true, memberName: `${member.firstName} ${member.lastName}` };
    });

    if (result.success) {
      await logActivity('PROMOTE', 'MEMBER', `${result.memberName} (${validated.data.step})`).catch(() => { });
      await inngest.send({ name: 'member/step.completed', data: { memberId: validated.data.memberId, organizationId: orgId, newStep: validated.data.step } }).catch(() => { });
      revalidatePath('/[locale]/dashboard', 'layout');
    }
    return result;
  } catch (e) {
    return { error: 'Erro interno ao processar.' };
  }
}
