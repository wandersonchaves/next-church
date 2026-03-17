import { Inngest } from 'inngest';

/**
 * Cliente Inngest configurado para o ambiente do next-church.
 */
export const inngest = new Inngest({
  id: 'next-church',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
