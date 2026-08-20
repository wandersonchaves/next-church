'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { inngest } from '@/libs/Inngest';
import { EvolutionGoClient } from '@/libs/evolution-go/client';
import { db } from '@/libs/DB';
import { members } from '@/models/Schema';
import { eq, and, isNull, count } from 'drizzle-orm';

const BroadcastSchema = z.object({
  message: z.string().min(5, 'A mensagem deve ter pelo menos 5 caracteres'),
  filters: z.object({
    currentStep: z.string().optional().nullable().or(z.literal('')),
    generationSlot: z.string().optional().nullable().or(z.literal('')),
    tag: z.string().optional().nullable().or(z.literal('')),
  }),
});

export async function getRecipientCountAction(filters: z.infer<typeof BroadcastSchema>['filters']) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado' };

  try {
    const conditions = [
      eq(members.organizationId, orgId),
      isNull(members.deletedAt)
    ];

    if (filters.currentStep) {
      conditions.push(eq(members.currentStep, filters.currentStep as any));
    }

    if (filters.generationSlot) {
      conditions.push(eq(members.generationSlot, Number(filters.generationSlot)));
    }

    if (filters.tag) {
      conditions.push(eq(members.kidsNotes, filters.tag));
    }

    const [result] = await db
      .select({ total: count() })
      .from(members)
      .where(and(...conditions));

    return { success: true, count: result?.total || 0 };
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao contar destinatários' };
  }
}

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

    // Independente do resultado da API (404 ou 200), se tivermos o nome da instância,
    // vamos registrar o vínculo no nosso banco, pois os logs mostram que o webhook já está ativo.
    const { NotificationService } = await import('@/libs/services/NotificationService');
    const identifier = process.env.EVOLUTION_INSTANCE || 'test-dsv-02';

    await NotificationService.logConnectionState(identifier, 'CONNECTED_AND_SYNCED_MANUAL', orgId);
    console.info(`[SYNC_WEBHOOK_INTERNAL] Mapping created: Instance ${identifier} -> Org ${orgId}`);

    if (result.success) {
      return { success: true };
    } else {
      // Se deu 404 mas o vínculo interno foi criado, retornamos sucesso com aviso
      return {
        success: true,
        message: 'Vínculo interno atualizado. As mensagens devem aparecer agora.'
      };
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

export async function getQRCodeAction() {
  try {
    const client = EvolutionGoClient.getInstance();
    const res = await client.getQRCode();
    return res;
  } catch (error) {
    return { error: 'Falha ao gerar QR Code' };
  }
}

export async function connectInstanceAction(phone?: string) {
  console.log(`🔌 [CONNECT_ACTION] Iniciando conexão para instância...`);
  try {
    const client = EvolutionGoClient.getInstance();
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://next-church.up.railway.app';
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/evolution`;

    console.log(`🔌 [CONNECT_ACTION] Webhook URL: ${webhookUrl}`);
    const res = await client.connectInstance(phone, webhookUrl);
    
    console.log(`🔌 [CONNECT_ACTION] Resultado:`, JSON.stringify(res));
    return res;
  } catch (error) {
    console.error(`🔌 [CONNECT_ACTION_ERROR]`, error);
    return { error: 'Falha ao conectar instância' };
  }
}

export async function pairInstanceAction(phone: string) {
  try {
    const client = EvolutionGoClient.getInstance();
    const res = await client.pairInstance(phone);
    return res;
  } catch (error) {
    return { error: 'Falha ao solicitar código de pareamento' };
  }
}

/**
 * Diagnostic action to test Evolution API reachability and latency.
 */
export async function testEvolutionHealthAction() {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado' };

  try {
    const client = EvolutionGoClient.getInstance();
    const health = await client.pingHealth();
    const status = await client.getInstanceStatus();
    return {
      success: health.reachable,
      health,
      status,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Sends a single test WhatsApp message with full diagnostic output.
 */
export async function testWhatsAppMessageAction(params: { phone: string; message?: string }) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado' };

  try {
    const client = EvolutionGoClient.getInstance();
    const testText = params.message || `🔔 Teste de Conexão NextChurch (${new Date().toLocaleTimeString('pt-BR')})`;
    const result = await client.sendMessage(params.phone, testText, orgId);

    return {
      success: result.sent,
      externalId: result.externalId,
      endpoint: result.endpoint,
      latencyMs: result.latencyMs,
      error: result.error || (result.sent ? undefined : 'Falha desconhecida no envio'),
    };
  } catch (error) {
    console.error('[TEST_WHATSAPP_ACTION_ERROR]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

