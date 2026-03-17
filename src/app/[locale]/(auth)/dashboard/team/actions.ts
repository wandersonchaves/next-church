'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const InviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(['org:admin', 'org:member']),
  locale: z.string(),
  origin: z.string().optional(), // Recebido do cliente
});

export async function sendTeamInviteAction(data: z.infer<typeof InviteSchema>) {
  const { orgId, orgRole } = await auth();
  const client = await clerkClient();

  if (!orgId || orgRole !== 'org:admin') {
    return { error: "Apenas administradores podem convidar novos membros." };
  }

  const validated = InviteSchema.safeParse(data);
  if (!validated.success) return { error: "Dados inválidos" };

  try {
    // 1. Definimos a URL absoluta. 
    // Prioridade: Origin enviado pelo cliente > Env Var > Fallback Localhost
    const baseUrl = validated.data.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // IMPORTANTE: A URL deve ser absoluta para o Clerk não tentar resolver no domínio dele
    const redirectUrl = `${baseUrl}/${validated.data.locale}/dashboard`;

    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: validated.data.email,
      role: validated.data.role,
      redirectUrl: redirectUrl, 
    });

    revalidatePath('/[locale]/dashboard/team', 'page');
    return { success: true };
  } catch (e: any) {
    console.error('--- CLERK INVITE ERROR DETAILS ---');
    console.error(JSON.stringify(e.errors, null, 2));
    
    const firstError = e.errors?.[0];
    if (firstError?.code === 'already_invited') return { error: "Este e-mail já possui um convite pendente." };
    if (firstError?.code === 'form_identifier_exists') return { error: "Este usuário já é membro desta igreja." };

    return { error: firstError?.message || "Falha ao enviar convite." };
  }
}

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
