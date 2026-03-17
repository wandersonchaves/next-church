'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const InviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(['org:admin', 'org:member']).default('org:member'),
});

/**
 * Envia um convite oficial do Clerk para um novo membro da equipe.
 */
export async function sendTeamInviteAction(data: z.infer<typeof InviteSchema>) {
  const { orgId, orgRole } = await auth();
  const client = await clerkClient();

  // Segurança: Apenas admins podem convidar
  if (!orgId || orgRole !== 'org:admin') {
    return { error: "Apenas administradores podem convidar novos membros." };
  }

  const validated = InviteSchema.safeParse(data);
  if (!validated.success) return { error: "Dados inválidos" };

  try {
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: validated.data.email,
      role: validated.data.role,
      // O link de redirecionamento após o cadastro
      redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard'}`,
    });

    revalidatePath('/[locale]/dashboard/team', 'page');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    // Erro comum: usuário já convidado
    if (e?.errors?.[0]?.code === 'already_invited') {
      return { error: "Este e-mail já possui um convite pendente." };
    }
    return { error: "Falha ao enviar convite. Verifique se o e-mail está correto." };
  }
}

/**
 * Revoga um convite pendente.
 */
export async function revokeInviteAction(invitationId: string) {
  const { orgId, orgRole } = await auth();
  const client = await clerkClient();

  if (!orgId || orgRole !== 'org:admin') return { error: "Não autorizado" };

  try {
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId,
    });
    revalidatePath('/[locale]/dashboard/team', 'page');
    return { success: true };
  } catch (e) {
    return { error: "Falha ao revogar convite." };
  }
}
