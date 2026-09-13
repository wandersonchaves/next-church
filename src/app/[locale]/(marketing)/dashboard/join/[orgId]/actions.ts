'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
import { logActivity } from '@/libs/services/AuditService';
import { members } from '@/models/Schema';
import { MemberSchema } from '@/validations/MemberValidation';

/**
 * Ação pública para cadastro de membros via link externo.
 * Não utiliza auth() do Clerk, pois o acesso é público.
 * O organizationId é passado via parâmetro seguro.
 * @param orgId - Identificador único da organização onde o membro será cadastrado.
 * @param data - Dados do novo membro a ser registrado.
 */
export async function createPublicMemberAction(orgId: string, data: any) {
  const validated = MemberSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Dados inválidos ou incompletos.' };
  }

  try {
    const createdMember = await db.transaction(async (tx) => {
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
        lineage,
        generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
        isBaptized: validated.data.isBaptized || false,
        currentStep: 'DECISION',
      }).returning();

      return newMember;
    });

    if (createdMember) {
      // Log de atividade e gatilho de boas-vindas
      await logActivity('CREATE', 'MEMBER', `${createdMember.firstName} ${createdMember.lastName} (Link Público)`).catch(() => { });
      await inngest.send({
        name: 'member/created',
        data: { memberId: createdMember.id, organizationId: orgId },
      }).catch(() => { });
    }

    return { success: true };
  } catch (e) {
    console.error('[PUBLIC_REGISTRATION_ERROR]', e);
    return { error: 'Falha ao processar cadastro. Tente novamente.' };
  }
}
