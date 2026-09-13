import { serve } from 'inngest/next';
import { inngest } from '@/libs/Inngest';
import {
  dailyBirthdayCheck,
  onMemberCreated,
  onStepCompleted,
  onWhatsAppWebhook,
  processIncomingMessage,
  sendBroadcast,
  watchdogWhatsAppConnection,
  weeklyLeadershipReport,
} from '@/libs/services/InngestFunctions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    onStepCompleted,
    sendBroadcast,
    onMemberCreated,
    dailyBirthdayCheck,
    weeklyLeadershipReport,
    onWhatsAppWebhook,
    watchdogWhatsAppConnection,
    processIncomingMessage,
  ],
});
