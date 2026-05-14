import { Inngest } from 'inngest';
import { Env } from './Env';

/**
 * Cliente Inngest configurado para o ambiente do next-church.
 */
export const inngest = new Inngest({
  id: 'next-church',
  eventKey: Env.INNGEST_EVENT_KEY,
  signingKey: Env.INNGEST_SIGNING_KEY,
  // Para produção, usamos a URL oficial de eventos
  baseUrl: process.env.NODE_ENV === 'production' ? 'https://event.inngest.com' : undefined,
});
