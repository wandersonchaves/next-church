
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
    const supportedEvents = ['Message', 'Connected', 'QRCode', 'Logout', 'Disconnected'];
    if (!supportedEvents.includes(event)) {
      return NextResponse.json({ status: 'ignored' });
    }

    console.info(`[EVOLUTION_GO_WEBHOOK] Event: ${event} | Instance: ${data.instanceId}`);

    // Strategy Pattern for Event Handling
    switch (event) {
      case 'Message':
        // Extract sender (JID), content, and instanceId
        const sender = data.sender || data.Info?.remoteJid;
        const content = data.content || data.Message?.conversation || data.Message?.extendedTextMessage?.text;
        
        if (sender && content) {
          await NotificationService.saveIncomingMessage({
            sender,
            content,
            instanceId: data.instanceId,
          });
        }
        break;

      case 'Connected':
        await NotificationService.logConnectionState(data.instanceId, 'CONNECTED');
        break;

      case 'Logout':
      case 'Disconnected':
        await NotificationService.logConnectionState(data.instanceId, 'LOGGED_OUT');
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
