import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
import { members, notificationLogs } from '@/models/Schema';
import { WhatsAppService } from './WhatsAppService';

/**
 * Função Inngest que gerencia a jornada do membro e registra auditoria de mensagens.
 * @param event - O evento recebido do Inngest.
 * @param step - O objeto step para execução de passos.
 */
export const onStepCompleted = inngest.createFunction(
  { id: 'on-member-step-completed', name: 'Automação: Progresso na Jornada' },
  { event: 'member/step.completed' },
  async ({ event, step }) => {
    const { memberId, organizationId, newStep } = event.data;

    const member = await step.run('fetch-member', async () => {
      const [res] = await db.select().from(members).where(eq(members.id, memberId));
      return res;
    });

    if (!member || !member.phone) {
      return { error: 'Member or phone not found' };
    }

    const templates: Record<string, string> = {
      UNIVERSITY_OF_LIFE: `Olá ${member.firstName}! 🎉\n\nParabéns por concluir a *Universidade da Vida*! Que alegria ver seu crescimento.\n\nO seu próximo passo nessa jornada é o *Encontro com Deus*. Já estamos com as inscrições abertas e seria incrível ter você conosco! 🔥\n\nDeus te abençoe!`,
      ENCOUNTER: `Ei ${member.firstName}! O seu Encontro com Deus foi apenas o começo. ✨\n\nAgora você iniciou o nível de *Capacitação de Destino*. Estamos orando por você nessa nova fase de liderança!`,
      SENDING: `Glória a Deus, ${member.firstName}! 🚀\n\nVocê acaba de ser *Enviado* como um líder na visão G12. Vá e frutifique! Estamos juntos nessa missão.`,
    };

    const message = templates[newStep];
    if (!message) {
      return { status: 'no_message_needed' };
    }

    await step.sleep('wait-for-personal-touch', '1m');

    const sendResult = await step.run('send-whatsapp', async () => {
      return await WhatsAppService.sendMessage(member.phone!, message);
    });

    await step.run('log-notification', async () => {
      await db.insert(notificationLogs).values({
        organizationId,
        memberId,
        type: 'WHATSAPP_AUTO',
        status: sendResult.sent ? 'SENT' : 'FAILED',
        content: message,
        sentAt: new Date(),
      });
    });

    return { status: 'processed', sent: sendResult.sent };
  },
);

/**
 * Função Inngest que realiza o envio de mensagens em massa (Broadcast).
 * @param event - O evento recebido do Inngest.
 * @param step - O objeto step para execução de passos.
 */
export const sendBroadcast = inngest.createFunction(
  { id: 'send-broadcast', name: 'Comunicação: Envio em Massa' },
  { event: 'notification/broadcast.send' },
  async ({ event, step }) => {
    const { organizationId, filters, message } = event.data;

    // 1. Busca membros segmentados usando construção dinâmica de filtros
    const targetMembers = await step.run('fetch-targets', async () => {
      const conditions = [eq(members.organizationId, organizationId)];

      if (filters.currentStep) {
        conditions.push(eq(members.currentStep, filters.currentStep));
      }

      if (filters.generationSlot) {
        conditions.push(eq(members.generationSlot, Number(filters.generationSlot)));
      }

      return await db
        .select()
        .from(members)
        .where(and(...conditions));
    });

    // 2. Envio em lote com controle de fluxo
    const results = [];
    for (const member of targetMembers) {
      if (!member.phone) {
        continue;
      }

      const res = await step.run(`send-to-${member.id}`, async () => {
        const personalizedMessage = message.replace('{name}', member.firstName);
        const sendRes = await WhatsAppService.sendMessage(member.phone!, personalizedMessage);

        await db.insert(notificationLogs).values({
          organizationId,
          memberId: member.id,
          type: 'WHATSAPP_BROADCAST',
          status: sendRes.sent ? 'SENT' : 'FAILED',
          content: personalizedMessage,
          sentAt: new Date(),
        });

        return sendRes;
      });

      results.push(res);
      await step.sleep(`throttle-${member.id}`, '2s');
    }

    return { total: targetMembers.length, processed: results.length };
  },
);
