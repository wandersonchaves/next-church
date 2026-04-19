'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { inngest } from '@/libs/Inngest';
import { EvolutionGoClient } from '@/libs/evolution-go/client';

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

/**
 * Sincroniza a configuração do Webhook na Evolution API
 */
export async function syncWebhookAction() {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado' };

  try {
    const client = EvolutionGoClient.getInstance();
    
    // Constrói a URL do Webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://next-church.up.railway.app';
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/evolution`;

    const result = await client.setWebhook(webhookUrl);

    if (result.success) {
      // Registrar vínculo da instância com a organização atual para o Webhook saber para onde mandar as mensagens
      const { NotificationService } = await import('@/libs/services/NotificationService');
      const status = await client.getInstanceStatus();
      const identifier = status.name || process.env.EVOLUTION_INSTANCE || 'default';
      
      await NotificationService.logConnectionState(identifier, 'CONNECTED_AND_SYNCED', orgId);
      console.info(`[SYNC_WEBHOOK] Instance ${identifier} claimed by Org ${orgId}`);
      
      return { success: true };
    } else {
      return { error: typeof result.error === 'string' ? result.error : 'Falha ao sincronizar webhook' };
    }
  } catch (error) {
  console.error('[SYNC_WEBHOOK_ERROR]', error);
  return { error: 'Erro interno ao sincronizar' };
  }
  }

  /**
  * Busca o status da instância do WhatsApp
  */
  export async function getWhatsAppStatusAction() {
  try {
  const client = EvolutionGoClient.getInstance();
  const status = await client.getInstanceStatus();
  return { success: true, status };
  } catch (error) {
  return { success: false, error: 'Falha ao buscar status' };
  }
  }
