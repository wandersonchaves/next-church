import { serve } from 'inngest/next';
import { inngest } from '@/libs/Inngest';
import {
  dailyBirthdayCheck,
  onMemberCreated,
  onStepCompleted,
  sendBroadcast,
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
  ],
});
