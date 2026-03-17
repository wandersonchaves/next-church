'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { ministries, memberMinistries } from '@/models/Schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const MinistrySchema = z.object({
  name: z.string().min(3, "Nome do ministério é obrigatório"),
  description: z.string().optional(),
  leaderId: z.string().uuid().optional().nullable().or(z.literal('')),
});

export async function createMinistryAction(data: z.infer<typeof MinistrySchema>) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Não autorizado" };
  const validated = MinistrySchema.safeParse(data);
  if (!validated.success) return { error: "Dados inválidos" };

  try {
    await db.insert(ministries).values({
      organizationId: orgId,
      name: validated.data.name,
      description: validated.data.description,
      leaderId: validated.data.leaderId === "" ? null : validated.data.leaderId,
    });
    revalidatePath('/[locale]/dashboard/ministries', 'page');
    return { success: true };
  } catch (e) {
    return { error: "Falha ao criar." };
  }
}

export async function updateMinistryAction(id: string, data: z.infer<typeof MinistrySchema>) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Não autorizado" };
  const validated = MinistrySchema.safeParse(data);
  if (!validated.success) return { error: "Dados inválidos" };

  try {
    await db.update(ministries)
      .set({
        name: validated.data.name,
        description: validated.data.description,
        leaderId: validated.data.leaderId === "" ? null : validated.data.leaderId,
      })
      .where(and(eq(ministries.id, id), eq(ministries.organizationId, orgId)));
    revalidatePath('/[locale]/dashboard/ministries', 'page');
    return { success: true };
  } catch (e) {
    return { error: "Falha ao atualizar." };
  }
}

export async function deleteMinistryAction(id: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Não autorizado" };
  try {
    await db.delete(ministries).where(and(eq(ministries.id, id), eq(ministries.organizationId, orgId)));
    revalidatePath('/[locale]/dashboard/ministries', 'page');
    return { success: true };
  } catch (e) {
    return { error: "Falha ao excluir." };
  }
}

export async function linkMemberToMinistryAction(memberId: string, ministryId: string, role: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Não autorizado" };
  try {
    await db.insert(memberMinistries).values({ memberId, ministryId, role });
    revalidatePath('/[locale]/dashboard/ministries', 'page');
    revalidatePath('/[locale]/dashboard/ministries/[id]', 'page');
    return { success: true };
  } catch (e) {
    return { error: "Membro já vinculado." };
  }
}

export async function unlinkMemberFromMinistryAction(memberId: string, ministryId: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: "Não autorizado" };
  try {
    await db.delete(memberMinistries)
      .where(and(eq(memberMinistries.memberId, memberId), eq(memberMinistries.ministryId, ministryId)));
    revalidatePath('/[locale]/dashboard/ministries', 'layout');
    return { success: true };
  } catch (e) {
    return { error: "Falha ao remover voluntário." };
  }
}
