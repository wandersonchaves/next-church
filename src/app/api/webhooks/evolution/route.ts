import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { inngest } from '@/libs/Inngest';
import { NotificationService } from '@/libs/services/NotificationService';

export const dynamic = 'force-dynamic';

/**
 * Evolution GO / Evolution API Webhook Handler
 * Optimized for performance: Validates, saves directly, and hands off to Inngest for AI processing.
 * @param req - Objeto da requisição HTTP recebida da Evolution API.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const rawEvent = String(event || '');
    const incomingEvent = rawEvent.toUpperCase();
    const normalizedEvent = incomingEvent.replace(/[._]/g, '');

    // Smart sender resolution: resolve @lid to actual phone JID
    const messageData = data?.data || data;
    const rawSender = messageData?.Info?.Sender || messageData?.Info?.Chat || messageData?.key?.remoteJid || messageData?.sender || '';
    let sender = messageData?.Info?.Chat || rawSender;

    if (sender.includes('@lid') || !sender) {
      if (messageData?.Info?.Chat && !messageData.Info.Chat.includes('@lid')) {
        sender = messageData.Info.Chat;
      } else if (messageData?.Info?.SenderAlt && !messageData.Info.SenderAlt.includes('@lid')) {
        sender = messageData.Info.SenderAlt;
      } else if (messageData?.Info?.Sender && !messageData.Info.Sender.includes('@lid')) {
        sender = messageData.Info.Sender;
      } else if (rawSender && !rawSender.includes('@lid')) {
        sender = rawSender;
      }
    }

    if (sender.includes('@newsletter') || sender.includes('@status')) {
      return NextResponse.json({ status: 'ignored_source', event: incomingEvent });
    }

    const isMessageEvent = normalizedEvent.includes('MESSAGE') || normalizedEvent.includes('UPSERT');
    const isConnectionEvent = normalizedEvent.includes('CONNECTION') || normalizedEvent.includes('CONNECTED') || normalizedEvent.includes('DISCONNECT') || normalizedEvent.includes('LOGOUT');
    const isQrEvent = normalizedEvent.includes('QR');

    if (!isMessageEvent && !isConnectionEvent && !isQrEvent) {
      console.warn(`[EVOLUTION_WEBHOOK] Ignored unsupported event: ${incomingEvent}`);
      return NextResponse.json({ status: 'ignored', event: incomingEvent });
    }

    const isFromMe = Boolean(
      messageData?.key?.fromMe
      ?? messageData?.Info?.IsFromMe
      ?? messageData?.fromMe
      ?? false,
    );

    const isGroup = Boolean(
      messageData?.Info?.IsGroup
      || sender.includes('@g.us')
      || messageData?.key?.remoteJid?.includes('@g.us'),
    );

    console.warn(`[EVOLUTION_WEBHOOK] Event: ${incomingEvent} | Sender: ${sender} | FromMe: ${isFromMe} | Group: ${isGroup}`);

    // Smart Sanitization
    const sanitizedData = {
      event: body.event,
      instanceId: body.instanceId || body.instance,
      instanceName: body.instanceName || body.instance,
      data: body.data,
    };

    // 🚀 PROCESSAMENTO DE MENSAGENS RECEBIDAS
    if (isMessageEvent && !isGroup && !isFromMe) {
      const msg = messageData?.message || messageData?.Message;

      const content = msg?.conversation
        || msg?.extendedTextMessage?.text
        || msg?.imageMessage?.caption
        || msg?.videoMessage?.caption
        || (typeof msg === 'string' ? msg : undefined)
        || messageData?.content
        || messageData?.text
        || messageData?.Message;

      const externalId = messageData?.key?.id || messageData?.Info?.ID;
      const contextInfo = msg?.extendedTextMessage?.contextInfo || msg?.imageMessage?.contextInfo || msg?.videoMessage?.contextInfo;
      const parentExternalId = contextInfo?.stanzaId || contextInfo?.quotedMessage?.key?.id;

      if (content && sender) {
        console.warn(`[EVOLUTION_WEBHOOK] Incoming user message from ${sender}: "${String(content).slice(0, 100)}"`);

        await NotificationService.saveIncomingMessage({
          sender: String(sender),
          content: String(content),
          instanceId: String(body.instanceId || body.instance || ''),
          instanceName: String(body.instanceName || body.instance || ''),
          externalId: String(externalId || ''),
          parentExternalId: String(parentExternalId || ''),
        }).catch((e) => {
          console.error('[WEBHOOK_DIRECT_SAVE_ERROR]', e);
          return null;
        });

        // Envia para o Inngest para processamento assíncrono com debounce de 10s (evita envios duplicados)
        console.warn(`[EVOLUTION_WEBHOOK] Dispatching whatsapp/message.received for AI analysis to Inngest...`);
        await inngest.send({
          name: 'whatsapp/message.received',
          data: {
            sender: String(sender),
            content: String(content),
            instanceId: String(body.instanceId || body.instance || ''),
            instanceName: String(body.instanceName || body.instance || ''),
          },
        }).catch(e => console.error('[WEBHOOK_MESSAGE_RECEIVED_DISPATCH_ERROR]', e));

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
          normalizedEvent: incomingEvent,
        },
      });
    } catch (inngestError) {
      console.error(`[EVOLUTION_WEBHOOK] Inngest Dispatch Failed:`, inngestError);
    }

    return NextResponse.json({ success: true, processed: 'direct+async' });
  } catch (error) {
    console.error('[EVOLUTION_WEBHOOK_CRITICAL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
