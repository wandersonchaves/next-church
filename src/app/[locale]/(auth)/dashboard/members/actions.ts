'use server';

import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
import { journeyHistory, memberJourneys, members } from '@/models/Schema';
import { MemberSchema, StepCompletionSchema } from '@/validations/MemberValidation';

export async function createMemberAction(data: any) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Organization required' };
  const validated = MemberSchema.safeParse(data);
  if (!validated.success) return { error: 'Dados inválidos' };

  try {
    return await db.transaction(async (tx) => {
      let lineage = '';
      if (validated.data.leaderId) {
        const [leader] = await tx.select({ lineage: members.lineage }).from(members).where(eq(members.id, validated.data.leaderId)).limit(1);
        lineage = leader?.lineage ? `${leader.lineage}.${validated.data.leaderId}` : validated.data.leaderId;
      }
      const [newMember] = await tx.insert(members).values({
        ...validated.data,
        organizationId: orgId,
        leaderId: validated.data.leaderId || null,
        lineage,
        birthDate: new Date(validated.data.birthDate),
        generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
      }).returning();

      if (newMember) {
        await inngest.send({ name: 'member/created', data: { memberId: newMember.id, organizationId: orgId } });
      }
      revalidatePath('/[locale]/dashboard', 'layout');
      return { success: true, data: newMember };
    });
  } catch (e) {
    return { error: 'Falha ao salvar membro.' };
  }
}

export async function updateMemberAction(memberId: string, data: any) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Unauthorized' };
  const validated = MemberSchema.safeParse(data);
  if (!validated.success) return { error: 'Dados inválidos' };

  try {
    return await db.transaction(async (tx) => {
      const [currentMember] = await tx.select().from(members).where(eq(members.id, memberId)).limit(1);
      let newLineage = currentMember?.lineage || '';

      if (validated.data.leaderId !== currentMember?.leaderId) {
        if (validated.data.leaderId) {
          const [leader] = await tx.select({ lineage: members.lineage }).from(members).where(eq(members.id, validated.data.leaderId)).limit(1);
          newLineage = leader?.lineage ? `${leader.lineage}.${validated.data.leaderId}` : validated.data.leaderId;
        } else {
          newLineage = '';
        }
      }

      await tx.update(members).set({
        ...validated.data,
        leaderId: validated.data.leaderId || null,
        lineage: newLineage,
        birthDate: new Date(validated.data.birthDate),
        generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
        updatedAt: new Date(),
      }).where(and(eq(members.id, memberId), eq(members.organizationId, orgId)));

      revalidatePath('/[locale]/dashboard', 'layout');
      return { success: true };
    });
  } catch (e) {
    return { error: 'Falha ao atualizar membro.' };
  }
}

export async function deleteMemberAction(memberId: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Unauthorized' };
  try {
    await db.delete(members).where(and(eq(members.id, memberId), eq(members.organizationId, orgId)));
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
      return { success: true };
    });
    if (result.success) {
      await inngest.send({ name: 'member/step.completed', data: { memberId: validated.data.memberId, organizationId: orgId, newStep: validated.data.step } }).catch(() => { });
      revalidatePath('/[locale]/dashboard', 'layout');
    }
    return result;
  } catch (e) {
    return { error: 'Erro interno ao processar.' };
  }
}
