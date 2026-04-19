
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

    // Sanitização para evitar erro de limite do Inngest (256KB)
    // Removemos campos de mídia pesados que não são usados no processamento inicial
    const sanitizedBody = JSON.parse(JSON.stringify(body));
    const recursiveSanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      delete obj.jpegThumbnail;
      delete obj.thumbnail;
      for (const key in obj) {
        if (typeof obj[key] === 'object') recursiveSanitize(obj[key]);
      }
    };
    recursiveSanitize(sanitizedBody);

    // Asynchronous hand-off to Inngest
    await inngest.send({
      name: 'whatsapp/webhook.received',
      data: {
        ...sanitizedBody,
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

