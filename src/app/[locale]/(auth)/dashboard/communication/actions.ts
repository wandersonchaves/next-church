'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { inngest } from '@/libs/Inngest';

const BroadcastSchema = z.object({
  message: z.string().min(5, 'A mensagem deve ter pelo menos 5 caracteres'),
  filters: z.object({
    currentStep: z.string().optional().nullable().or(z.literal('')),
    generationSlot: z.string().optional().nullable().or(z.literal('')),
  }),
});

export async function sendBroadcastAction(data: z.infer<typeof BroadcastSchema>) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Não autorizado' };
  }

  const validated = BroadcastSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Dados inválidos' };
  }

  try {
    // Dispara o workflow do Inngest
    await inngest.send({
      name: 'notification/broadcast.send',
      data: {
        organizationId: orgId,
        filters: validated.data.filters,
        message: validated.data.message,
      },
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao colocar mensagens na fila.' };
  }
}
