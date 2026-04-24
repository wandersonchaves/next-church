
import { NextResponse } from 'next/server';
import { inngest } from '@/libs/Inngest';
import { NotificationService } from '@/libs/services/NotificationService';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * Evolution GO v2 Webhook Handler
 * Optimized for performance: Validates and hands off to Inngest immediately.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Evolution GO (Golang) uses short names like MESSAGE, CONNECTION
    const incomingEvent = (event || '').toUpperCase();

    // Early Filter: Ignore events we don't care about or that are too noisy
    const sender = data?.Info?.Sender || data?.key?.remoteJid || '';
    if (sender.includes('@newsletter') || sender.includes('@status')) {
      return NextResponse.json({ status: 'ignored_source', event: incomingEvent });
    }

    const supportedEvents = [
      'MESSAGE', 
      'MESSAGES.UPSERT', 
      'CONNECTION', 
      'CONNECTION_UPDATE',
      'CONNECTED',
      'QRCODE',
      'LOGOUT', 
      'DISCONNECTED'
    ];

    if (!supportedEvents.includes(incomingEvent)) {
      return NextResponse.json({ status: 'ignored', event: incomingEvent });
    }

    console.info(`[EVOLUTION_GO_WEBHOOK] Event: ${incomingEvent} from ${sender}`);

    // Smart Sanitization
    const sanitizedData = {
      event: body.event,
      instanceId: body.instanceId,
      instanceName: body.instanceName,
      data: body.data
    };

    // 🚀 SALVAMENTO DIRETO (ALTA PERFORMANCE)
    // Se for uma mensagem, salvamos imediatamente para garantir que o Inbox atualize rápido
    if (['MESSAGE', 'MESSAGES.UPSERT'].includes(incomingEvent)) {
      const messageData = body.data;
      const msg = messageData?.message || messageData?.Message;

      const content = msg?.conversation || 
                      msg?.extendedTextMessage?.text ||
                      msg?.imageMessage?.caption ||
                      msg?.videoMessage?.caption ||
                      messageData?.content;

      const externalId = messageData?.key?.id || messageData?.Info?.ID;
      const contextInfo = msg?.extendedTextMessage?.contextInfo || msg?.imageMessage?.contextInfo || msg?.videoMessage?.contextInfo;
      const parentExternalId = contextInfo?.stanzaId || contextInfo?.quotedMessage?.key?.id;

      if (content && sender) {
        await NotificationService.saveIncomingMessage({
          sender: String(sender),
          content: String(content),
          instanceId: String(body.instanceId || ''),
          instanceName: String(body.instanceName || ''),
          externalId: String(externalId || ''),
          parentExternalId: String(parentExternalId || ''),
        }).catch(e => console.error('[WEBHOOK_DIRECT_SAVE_ERROR]', e));

        // Limpa o cache da página de Inbox em todos os idiomas
        revalidatePath('/[locale]/dashboard/communication/inbox', 'page');
      }
    }

    // Mantemos o Inngest para outros processamentos assíncronos (logs de conexão, etc)
    try {
      await inngest.send({
        name: 'whatsapp/webhook.received',
        data: {
          ...sanitizedData,
          normalizedEvent: incomingEvent 
        },
      });
    } catch (inngestError) {
      console.error(`[EVOLUTION_GO_WEBHOOK] Inngest Dispatch Failed:`, inngestError);
    }

    // Respond immediately with 200 OK as per best practices
    return NextResponse.json({ success: true, processed: 'direct+async' });
  } catch (error) {
    console.error('[EVOLUTION_GO_WEBHOOK_CRITICAL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
