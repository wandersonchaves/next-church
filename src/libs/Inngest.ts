import { Inngest } from 'inngest';
import { Env } from './Env';

/**
 * Cliente Inngest configurado para o ambiente do next-church.
 */
export const inngest = new Inngest({
  id: 'next-church',
  eventKey: Env.INNGEST_EVENT_KEY,
  signingKey: Env.INNGEST_SIGNING_KEY,
  // api.inngest.com é o endpoint mais estável para o SDK v4
  baseUrl: process.env.NODE_ENV === 'production' ? 'https://api.inngest.com/' : undefined,
});
