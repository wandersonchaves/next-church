
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

    console.info(`[EVOLUTION_GO_WEBHOOK] Event: ${incomingEvent} for Instance: ${body.instanceName}`);

    // Asynchronous hand-off to Inngest
    try {
      await inngest.send({
        name: 'whatsapp/webhook.received',
        data: {
          ...body,
          normalizedEvent: incomingEvent 
        },
      });
      console.info(`[EVOLUTION_GO_WEBHOOK] Event ${incomingEvent} sent to Inngest successfully`);
    } catch (inngestError) {
      console.error(`[EVOLUTION_GO_WEBHOOK] Failed to send to Inngest:`, inngestError);
    }

    // Respond immediately with 200 OK as per best practices
    return NextResponse.json({ success: true, processed: 'async' });
  } catch (error) {
    console.error('[EVOLUTION_GO_WEBHOOK_CRITICAL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

