import { Inngest } from 'inngest';

// Criamos o cliente centralizado
// Em desenvolvimento, ele tentará se conectar ao servidor local (localhost:8288)
export const inngest = new Inngest({
  id: 'philadelphia-hub',
  // O eventKey é obrigatório para o .send(), usamos 'local' como fallback em dev
  eventKey: process.env.INNGEST_EVENT_KEY || 'local',
});
