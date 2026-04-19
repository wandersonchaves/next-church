
import { NextResponse } from 'next/server';
import { inngest } from '@/libs/Inngest';

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
    // We normalize everything to uppercase for comparison
    const incomingEvent = (event || '').toUpperCase();

    const supportedEvents = [
      'MESSAGE', 
      'MESSAGES.UPSERT', 
      'CONNECTION', 
      'CONNECTION_UPDATE',
      'CONNECTED',
      'CHAT_PRESENCE',
      'PRESENCE',
      'QRCODE',
      'LOGOUT', 
      'DISCONNECTED'
    ];

    if (!supportedEvents.includes(incomingEvent)) {
      return NextResponse.json({ status: 'ignored', event: incomingEvent });
    }

    console.info(`[EVOLUTION_GO_WEBHOOK] Event: ${incomingEvent}`);

    // Dica para Depuração "Elite": Logamos o objeto inteiro para inspeção no Railway
    if (incomingEvent === 'MESSAGE' || incomingEvent === 'MESSAGES.UPSERT') {
      console.log("📥 MENSAGEM RECEBIDA DO MEMBRO:", JSON.stringify(body, null, 2));
    }

    // Whitelist de campos essenciais para o processamento do Inbox
    // Isso reduz drasticamente o tamanho do payload (de MBs para KBs)
    const essentialData = {
      event: body.event,
      instanceId: body.instanceId,
      instanceName: body.instanceName,
      data: {
        event: body.data?.event,
        instanceId: body.data?.instanceId,
        instanceName: body.data?.instanceName,
        // Informações básicas da mensagem (Evolution v2)
        Info: body.data?.Info ? {
          ID: body.data.Info.ID,
          Sender: body.data.Info.Sender,
          Chat: body.data.Info.Chat,
          IsGroup: body.data.Info.IsGroup,
          IsFromMe: body.data.Info.IsFromMe,
          Timestamp: body.data.Info.Timestamp,
          Type: body.data.Info.Type,
          PushName: body.data.Info.PushName,
        } : undefined,
        // Estrutura de mensagem (Evolution v1/Baileys)
        key: body.data?.key ? {
          remoteJid: body.data.key.remoteJid,
          fromMe: body.data.key.fromMe,
          id: body.data.key.id,
        } : undefined,
        // Conteúdo da mensagem (Texto e Legendas)
        Message: body.data?.Message ? {
          conversation: body.data.Message.conversation,
          extendedTextMessage: body.data.Message.extendedTextMessage ? {
            text: body.data.Message.extendedTextMessage.text
          } : undefined,
          imageMessage: body.data.Message.imageMessage ? {
            caption: body.data.Message.imageMessage.caption
          } : undefined,
          videoMessage: body.data.Message.videoMessage ? {
            caption: body.data.Message.videoMessage.caption
          } : undefined,
          protocolMessage: body.data.Message.protocolMessage ? {
            type: body.data.Message.protocolMessage.type
          } : undefined,
        } : undefined,
        // Fallbacks de texto plano
        text: body.data?.text,
        content: body.data?.content,
      }
    };

    // Asynchronous hand-off to Inngest
    await inngest.send({
      name: 'whatsapp/webhook.received',
      data: {
        ...essentialData,
        normalizedEvent: incomingEvent 
      },
    });
    // Respond immediately with 200 OK as per best practices
    return NextResponse.json({ success: true, processed: 'async' });
  } catch (error) {
    console.error('[EVOLUTION_GO_WEBHOOK_CRITICAL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

