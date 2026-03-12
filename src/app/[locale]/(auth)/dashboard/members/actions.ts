'use server';

import arcjet, { detectBot, request, shield } from '@arcjet/next';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { members } from '@/models/Schema';
import { MemberSchema } from '@/validations/MemberValidation';

// Configuração básica do Arcjet para proteção de formulário
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    shield({ mode: 'LIVE' }),
    detectBot({ mode: 'LIVE', allow: [] }),
  ],
});

export async function createMemberAction(data: any) {
  const { orgId } = await auth();

  if (!orgId) {
    return { error: 'Organization required' };
  }

  // 1. Proteção de Infraestrutura (Arcjet)
  const req = await request();
  const decision = await aj.protect(req);
  if (decision.isDenied()) {
    return { error: 'Access denied by security shield' };
  }

  // 2. Validação de Domínio (Zod)
  const validated = MemberSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Dados inválidos', details: validated.error.format() };
  }

  try {
    // 3. Persistência com sanitização de dados (leaderId "" -> null)
    await db.insert(members).values({
      ...validated.data,
      leaderId: validated.data.leaderId === '' ? null : validated.data.leaderId,
      generationSlot: validated.data.generationSlot ? Number(validated.data.generationSlot) : null,
      birthDate: new Date(validated.data.birthDate), // Conversão manual string -> Date
      organizationId: orgId,
    });

    // 4. Invalidação de Cache para atualizar a árvore G12
    revalidatePath('/[locale]/dashboard', 'layout');

    return { success: true };
  } catch (e: any) {
    console.error('[MEMBER_CREATE_ERROR]', e);
    return { error: 'Falha ao persistir no banco de dados' };
  }
}
