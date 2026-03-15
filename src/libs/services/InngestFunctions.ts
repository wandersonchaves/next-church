import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { inngest } from '@/libs/Inngest';
import { members, notificationLogs } from '@/models/Schema';
import { WhatsAppService } from './WhatsAppService';

/**
 * Automação: Envio de Boas-vindas ao cadastrar novo membro.
 */
export const onMemberCreated = inngest.createFunction(
  { id: 'on-member-created', name: 'Automação: Boas-vindas' },
  { event: 'member/created' },
  async ({ event, step }) => {
    const { memberId, organizationId } = event.data;

    const member = await step.run('fetch-member', async () => {
      const [res] = await db.select().from(members).where(eq(members.id, memberId));
      return res;
    });

    if (!member || !member.phone) {
      return { error: 'No contact info' };
    }

    // Espera 5 minutos para o envio parecer menos robótico
    await step.sleep('wait-a-bit', '5m');

    const message = `Olá ${member.firstName}! Seja muito bem-vindo(a) ao *Philadelphia Hub*! 🎉\n\nÉ uma alegria ter você conosco em nossa família espiritual. Estamos orando para que este novo tempo seja de muito fruto e crescimento em sua vida.\n\nDeus te abençoe!`;

    const res = await step.run('send-whatsapp', async () => {
      return await WhatsAppService.sendMessage(member.phone!, message);
    });

    await step.run('log-notification', async () => {
      await db.insert(notificationLogs).values({
        organizationId,
        memberId,
        type: 'WHATSAPP_WELCOME',
        status: res.sent ? 'SENT' : 'FAILED',
        content: message,
        sentAt: new Date(),
      });
    });

    return { status: 'welcome_sent' };
  },
);

/**
 * Cron Job: Verificação diária de aniversariantes.
 * Roda todos os dias às 09:00 AM (Horário de Brasília/UTC-3 aproximado).
 */
export const dailyBirthdayCheck = inngest.createFunction(
  { id: 'daily-birthday-check', name: 'Cron: Parabéns Aniversariantes' },
  { cron: '0 12 * * *' }, // 12:00 UTC = ~09:00 AM no Brasil
  async ({ step }) => {
    // 1. Busca todos os aniversariantes do dia (independente da Org)
    const birthdayMembers = await step.run('fetch-birthdays', async () => {
      return await db.select().from(members).where(
        sql`EXTRACT(DAY FROM ${members.birthDate}) = EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(MONTH FROM ${members.birthDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
      );
    });

    const results = [];

    // 2. Envio em lote com throttling
    for (const member of birthdayMembers) {
      if (!member.phone) {
        continue;
      }

      const message = `Parabéns, ${member.firstName}! 🎂🎈\n\nNós do *Philadelphia Hub* celebramos a sua vida hoje! Desejamos que o Senhor te conceda um ano de vitórias, saúde e muita presença de Deus.\n\nTenha um dia abençoado!`;

      await step.run(`send-birthday-to-${member.id}`, async () => {
        const res = await WhatsAppService.sendMessage(member.phone!, message);

        await db.insert(notificationLogs).values({
          organizationId: member.organizationId,
          memberId: member.id,
          type: 'WHATSAPP_BIRTHDAY',
          status: res.sent ? 'SENT' : 'FAILED',
          content: message,
          sentAt: new Date(),
        });
      });

      results.push(member.id);
      await step.sleep(`throttle-${member.id}`, '2s');
    }

    return { processed: results.length };
  },
);

/**
 * Função Inngest que gerencia a jornada do membro e registra auditoria de mensagens.
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
 */
export const sendBroadcast = inngest.createFunction(
  { id: 'send-broadcast', name: 'Comunicação: Envio em Massa' },
  { event: 'notification/broadcast.send' },
  async ({ event, step }) => {
    const { organizationId, filters, message } = event.data;

    const targetMembers = await step.run('fetch-targets', async () => {
      const conditions = [eq(members.organizationId, organizationId)];
      if (filters.currentStep) {
        conditions.push(eq(members.currentStep, filters.currentStep));
      }
      if (filters.generationSlot) {
        conditions.push(eq(members.generationSlot, Number(filters.generationSlot)));
      }
      return await db.select().from(members).where(and(...conditions));
    });

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
