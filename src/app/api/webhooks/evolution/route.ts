
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

    // Performance: Fast response for ignored events
    const supportedEvents = [
      'Message', 
      'messages.upsert', 
      'Connected', 
      'connection.update',
      'Logout', 
      'Disconnected'
    ];

    if (!supportedEvents.includes(event)) {
      return NextResponse.json({ status: 'ignored' });
    }

    // Asynchronous hand-off to Inngest
    // We send the whole body to ensure we have all context (instance, sender, etc)
    await inngest.send({
      name: 'whatsapp/webhook.received',
      data: body,
    });

    // Respond immediately with 200 OK as per best practices
    return NextResponse.json({ success: true, processed: 'async' });
  } catch (error) {
    console.error('[EVOLUTION_GO_WEBHOOK_CRITICAL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

