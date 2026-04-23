
import { NextResponse } from 'next/server';
import { inngest } from '@/libs/Inngest';
import { NotificationService } from '@/libs/services/NotificationService';

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

    // Smart Sanitization: Remove heavy fields but keep structure for Inbox and Linking
    const sanitizedData = {
      event: body.event,
      instanceId: body.instanceId,
      instanceName: body.instanceName,
      data: body.data ? {
        event: body.data.event,
        instanceId: body.data.instanceId,
        instanceName: body.data.instanceName,
        // Informações da Mensagem
        Info: body.data.Info ? {
          ID: body.data.Info.ID,
          Sender: body.data.Info.Sender,
          Chat: body.data.Info.Chat,
          IsGroup: body.data.Info.IsGroup,
          IsFromMe: body.data.Info.IsFromMe,
          Timestamp: body.data.Info.Timestamp,
          Type: body.data.Info.Type,
          PushName: body.data.Info.PushName,
        } : undefined,
        // Estrutura de Mensagem
        Message: body.data.Message ? {
          conversation: body.data.Message.conversation,
          extendedTextMessage: body.data.Message.extendedTextMessage ? {
            text: body.data.Message.extendedTextMessage.text,
            contextInfo: body.data.Message.extendedTextMessage.contextInfo ? {
              stanzaId: body.data.Message.extendedTextMessage.contextInfo.stanzaId,
              participant: body.data.Message.extendedTextMessage.contextInfo.participant,
              quotedMessage: body.data.Message.extendedTextMessage.contextInfo.quotedMessage,
            } : undefined,
          } : undefined,
          imageMessage: body.data.Message.imageMessage ? { 
            caption: body.data.Message.imageMessage.caption,
            contextInfo: body.data.Message.imageMessage.contextInfo ? {
              stanzaId: body.data.Message.imageMessage.contextInfo.stanzaId,
              participant: body.data.Message.imageMessage.contextInfo.participant,
              quotedMessage: body.data.Message.imageMessage.contextInfo.quotedMessage,
            } : undefined
          } : undefined,
          videoMessage: body.data.Message.videoMessage ? { 
            caption: body.data.Message.videoMessage.caption,
            contextInfo: body.data.Message.videoMessage.contextInfo ? {
              stanzaId: body.data.Message.videoMessage.contextInfo.stanzaId,
              participant: body.data.Message.videoMessage.contextInfo.participant,
              quotedMessage: body.data.Message.videoMessage.contextInfo.quotedMessage,
            } : undefined
          } : undefined,
        } : undefined,
        // Fallbacks
        key: body.data.key ? {
          remoteJid: body.data.key.remoteJid,
          fromMe: body.data.key.fromMe,
          id: body.data.key.id,
        } : undefined,
      } : undefined
    };

    // Mantemos o Inngest para todos os processamentos assíncronos (Salvar mensagens, logs de conexão, etc)
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
