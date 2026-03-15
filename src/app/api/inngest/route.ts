import { serve } from 'inngest/next';
import { inngest } from '@/libs/Inngest';
import { onStepCompleted, sendBroadcast } from '@/libs/services/InngestFunctions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    onStepCompleted,
    sendBroadcast,
  ],
});
