'use server';

import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { journeyHistory, members } from '@/models/Schema';
import { MemberDomain } from '@/utils/MemberDomain';

/**
 * Promove um membro para o próximo passo da jornada G12.
 * @param memberId - O ID único do membro a ser promovido.
 * @param nextStep - O identificador do próximo passo da jornada.
 */
export async function promoteMemberAction(memberId: string, nextStep: any) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Não autorizado' };
  }

  // 1. Busca membro atual
  const [member] = await db.select().from(members).where(
    and(eq(members.id, memberId), eq(members.organizationId, orgId)),
  );

  if (!member) {
    return { error: 'Membro não encontrado' };
  }

  // 2. Valida transição via Domínio
  if (!MemberDomain.canTransitionTo(member.currentStep, nextStep)) {
    return { error: `Transição inválida de ${member.currentStep} para ${nextStep}` };
  }

  try {
    // 3. Update atômico + Histórico
    await db.transaction(async (tx) => {
      await tx.update(members)
        .set({ currentStep: nextStep, updatedAt: new Date() })
        .where(eq(members.id, memberId));

      await tx.insert(journeyHistory).values({
        memberId,
        oldStep: member.currentStep as any,
        newStep: nextStep,
        notes: `Promovido via Dashboard`,
      });
    });

    revalidatePath('/[locale]/dashboard', 'layout');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Erro ao atualizar jornada.' };
  }
}
