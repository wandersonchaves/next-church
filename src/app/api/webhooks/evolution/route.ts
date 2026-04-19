
import { NextResponse } from 'next/server';
import { NotificationService } from '@/libs/services/NotificationService';

/**
 * Evolution GO v2 Webhook Handler
 * Follows the Strategy pattern for event processing.
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
      'QRCode', 
      'Logout', 
      'Disconnected'
    ];

    if (!supportedEvents.includes(event)) {
      return NextResponse.json({ status: 'ignored' });
    }

    console.info(`[EVOLUTION_GO_WEBHOOK] Event: ${event}`);

    // Strategy Pattern for Event Handling
    switch (event) {
      case 'Message':
      case 'messages.upsert': {
        const messageData = event === 'messages.upsert' ? data.data : data;

        // v2 structure extraction
        const isFromMe = messageData.key?.fromMe;
        const sender = messageData.key?.remoteJid || messageData.sender;
        const content = messageData.message?.conversation || 
                        messageData.message?.extendedTextMessage?.text ||
                        messageData.content;

        // Ignore messages sent by the bot itself to avoid loops or redundant logs
        if (isFromMe) {
          return NextResponse.json({ status: 'ignored_from_me' });
        }

        if (sender && content) {
          await NotificationService.saveIncomingMessage({
            sender,
            content,
            instanceId: data.instanceId || body.instance,
          });
        }
        break;
      }

      case 'Connected':
      case 'connection.update':
        if (data.state === 'open' || event === 'Connected') {
          await NotificationService.logConnectionState(data.instanceId || body.instance, 'CONNECTED');
        }
        break;

      case 'Logout':
      case 'Disconnected':
        await NotificationService.logConnectionState(data.instanceId || body.instance, 'LOGGED_OUT');
        break;


      case 'QRCode':
        // Specific logic for QR Code monitoring can be added here
        console.info(`[EVOLUTION_GO] New QR Code available for ${data.instanceId}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EVOLUTION_GO_WEBHOOK_CRITICAL_ERROR]', error);
    // Returning 500 triggers Evolution GO's 5-retry policy if it's a transient failure
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
