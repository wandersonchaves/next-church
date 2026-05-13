import { db } from '@/libs/DB';
import { members } from '@/models/Schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { inngest } from '@/libs/Inngest';
import { WhatsAppService } from './WhatsAppService';
import { getWeeklySummary } from './AuditService';
import { clerkClient } from '@clerk/nextjs/server';
import { AppConfig } from '@/utils/AppConfig';
import { NotificationService } from './NotificationService';
import { Env } from '@/libs/Env';
import { EvolutionGoClient } from '@/libs/evolution-go/client';

/**
 * Cron Job: Monitor de Conexão WhatsApp.
 * Verifica a cada 1 hora se a instância está conectada.
 */
export const watchdogWhatsAppConnection = inngest.createFunction(
  { 
    id: "watchdog-whatsapp-connection", 
    name: "Monitor de Conexão WhatsApp",
    triggers: [
      { cron: "0 * * * *" },
      { event: "system/connection.check" }
    ]
  },
  async ({ step }) => {
    const status = await step.run("check-connection", async () => {
      const client = EvolutionGoClient.getInstance();
      return await client.getInstanceStatus();
    });

    if (!status.connected) {
      await step.run("log-disconnection", async () => {
        await NotificationService.logConnectionState(
          Env.EVOLUTION_INSTANCE || 'unknown',
          'DISCONNECTED_WATCHDOG',
          undefined,
          'System Watchdog'
        );
      });

      if (Env.ADMIN_PHONE) {
        await step.run("send-admin-alert", async () => {
          const message = [
            `🚨 *ALERTA DE DESCONEXÃO: ${AppConfig.name.toUpperCase()}*`,
            `Sua instância do WhatsApp está desconectada.`,
            ``,
            `Isso pode impedir o envio de mensagens automáticas e relatórios agendados.`,
            `Por favor, acesse o painel e reconecte seu dispositivo.`,
            ``,
            `_Verificado em: ${new Date().toLocaleString('pt-BR')}_`
          ].join('\n');

          await WhatsAppService.sendMessage({
            phone: Env.ADMIN_PHONE!,
            message: message,
            overrides: {
              instanceName: Env.ALERT_EVOLUTION_INSTANCE,
              apiKey: Env.ALERT_EVOLUTION_API_KEY
            }
          });
        });
      }
    }
  }
);

/**
 * Helper para buscar o nome da igreja no Clerk.
 */
async function getChurchName(orgId: string) {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return org.name || 'TelePaz Filadélfia';
  } catch {
    return 'TelePaz Filadélfia';
  }
}

/**
 * Evento: Boas-vindas para novo membro.
 */
export const onMemberCreated = inngest.createFunction(
  {
    id: 'on-member-created',
    name: 'Novo Membro: Boas-vindas',
    triggers: [{ event: 'member/created' }]
  },
  async ({ event, step }: any) => {
    const { memberId, organizationId } = event.data;

    const churchName = await step.run('get-church-name', async () => await getChurchName(organizationId));

    const member = await step.run('fetch-member', async () => {
      const [result] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId),
          isNull(members.deletedAt)
        ))
        .limit(1);
      return result;
    });

    if (member?.phone) {
      await step.run('send-whatsapp', async () => {
        const welcomeMessage = `Olá ${member.firstName}! Seja muito bem-vindo(a) à família *${churchName}*. Estamos felizes com sua decisão! 🙌`;
        await WhatsAppService.sendMessage({
          phone: member.phone!,
          message: welcomeMessage,
          organizationId: organizationId
        });
      });
    }

    return { status: 'welcome_sent' };
  },
);

/**
 * Evento: Conclusão de Passo da Jornada.
 */
export const onStepCompleted = inngest.createFunction(
  {
    id: 'on-step-completed',
    name: 'Jornada: Parabéns pelo Passo',
    triggers: [{ event: 'member/step.completed' }]
  },
  async ({ event, step }: any) => {
    const { memberId, organizationId, newStep } = event.data;

    const churchName = await step.run('get-church-name', async () => await getChurchName(organizationId));

    const member = await step.run('fetch-member', async () => {
      const [result] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId),
          isNull(members.deletedAt)
        ))
        .limit(1);
      return result;
    });

    if (member?.phone) {
      await step.run('send-congrats', async () => {
        const message = `Parabéns ${member.firstName}! Você concluiu o passo *${newStep.replace(/_/g, ' ')}* na jornada da *${churchName}*. Continue firme! ✨`;
        await WhatsAppService.sendMessage({
          phone: member.phone!,
          message: message,
          organizationId: organizationId
        });
      });
    }
  },
);

/**
 * Cron Job: Relatório Semanal de Atividades.
 */
export const weeklyLeadershipReport = inngest.createFunction(
  {
    id: "weekly-leadership-report",
    name: "Cron: Relatório Semanal",
    triggers: [{ cron: "0 11 * * 1" }]
  },
  async ({ step }: any) => {
    const orgs = await step.run("fetch-organizations", async () => {
      return await db.selectDistinct({ id: members.organizationId }).from(members);
    });

    for (const org of orgs) {
      const churchName = await step.run(`get-name-${org.id}`, async () => await getChurchName(org.id));

      const summary = await step.run(`generate-summary-${org.id}`, async () => {
        return await getWeeklySummary(org.id);
      });

      if (summary.stats.total > 0) {
        const pastor = await step.run(`get-pastor-${org.id}`, async () => {
          const [result] = await db
            .select()
            .from(members)
            .where(and(eq(members.organizationId, org.id), isNull(members.leaderId)))
            .limit(1);
          return result;
        });

        if (pastor?.phone) {
          await step.run(`send-report-${org.id}`, async () => {
            const message = [
              `📊 *RELATÓRIO SEMANAL: ${churchName.toUpperCase()}*`,
              `Olá, Pastor! Aqui estão as atividades da última semana na sua igreja:`,
              ``,
              `✅ *Novos Membros:* ${summary.stats.creates}`,
              `📈 *Promoções:* ${summary.stats.promotes}`,
              `📝 *Atualizações:* ${summary.stats.updates}`,
              `🗑️ *Exclusões:* ${summary.stats.deletes}`,
              ``,
              `Total de *${summary.stats.total}* ações realizadas.`,
              ``,
              `_Gerado por ${AppConfig.name}_`
            ].join('\n');

            await WhatsAppService.sendMessage({
              phone: pastor.phone!,
              message: message,
              organizationId: org.id
            });
          });

          await step.sleep(`wait-org-${org.id}`, '3s');
        }
      }
    }
  }
);

/**
 * Cron Job: Verificação diária de aniversariantes.
 */
export const dailyBirthdayCheck = inngest.createFunction(
  {
    id: "daily-birthday-check",
    name: "Cron: Parabéns Aniversariantes",
    triggers: [{ cron: "15 12 * * *" }]
  },
  async ({ step }: any) => {
    const membersList = await step.run("fetch-birthday-members", async () => {
      return await db.select().from(members).where(
        and(
          sql`EXTRACT(DAY FROM ${members.birthDate}) = EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(MONTH FROM ${members.birthDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          isNull(members.deletedAt)
        )
      );
    });

    for (const member of membersList) {
      if (member.phone) {
        await step.run(`send-birthday-msg-${member.id}`, async () => {
          const msg = `Que dia especial! Feliz aniversário ${member.firstName} 😃 Nós do TelePaz Filadélfia ✨ desejamos um novo ano abençoado. Celebramos sua vida, pois você é importante para Deus e para nós. Que o Senhor abençoe você e toda a sua família. 🙌🏼✨`;
          await WhatsAppService.sendMessage({
            phone: member.phone!,
            message: msg,
            organizationId: member.organizationId
          });
        });

        const delay = Math.floor(Math.random() * 5 + 5);
        await step.sleep(`wait-bday-${member.id}`, `${delay}s`);
      }
    }
  }
);

/**
 * Ação de Transmissão (Broadcast).
 */
export const sendBroadcast = inngest.createFunction(
  {
    id: 'send-broadcast',
    name: 'Comunicação: Transmissão em Massa',
    triggers: [{ event: 'notification/broadcast.send' }]
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { organizationId, filters, message } = event.data;

    const recipients = await step.run('fetch-recipients', async () => {
      const conditions = [
        eq(members.organizationId, organizationId),
        isNull(members.deletedAt)
      ];

      if (filters.currentStep) {
        conditions.push(eq(members.currentStep, filters.currentStep));
      }

      if (filters.generationSlot) {
        conditions.push(eq(members.generationSlot, Number(filters.generationSlot)));
      }

      if (filters.tag) {
        conditions.push(eq(members.kidsNotes, filters.tag));
      }

      return await db.select().from(members).where(and(...conditions));
    });

    let count = 0;
    for (const member of recipients) {
      if (member.phone) {
        count++;
        const personalizedMessage = message.replace(/\{name\}/g, member.firstName);

        await step.run(`send-${member.id}`, async () => {
          const result: any = await WhatsAppService.sendMessage({
            phone: member.phone!,
            message: personalizedMessage,
            organizationId: organizationId
          });
          const msgId = result?.key?.id || result?.data?.key?.id || result?.data?.id;

          await NotificationService.saveOutgoingMessage({
            phone: member.phone!,
            content: personalizedMessage,
            organizationId: organizationId,
            status: msgId ? 'SENT' : 'FAILED',
            externalId: msgId,
          });
        });

        if (count % 30 === 0) {
          await step.sleep(`batch-pause-${count}`, '2m');
        } else {
          const delay = Math.floor(Math.random() * 12 + 8);
          await step.sleep(`wait-${member.id}`, `${delay}s`);
        }
      }
    }

    return { totalSent: recipients.length };
  },
);

/**
 * Evento: Processamento Assíncrono de Webhook (WhatsApp).
 */
export const onWhatsAppWebhook = inngest.createFunction(
  {
    id: 'on-whatsapp-webhook-final',
    name: 'WhatsApp: Webhook Engine',
    triggers: [{ event: 'whatsapp/webhook.received' }]
  },
  async ({ event, step }: { event: any; step: any }) => {
    const payload = event.data;
    const normalizedEvent = (payload.normalizedEvent || payload.event || '').toUpperCase();
    const instanceId = payload.instanceId || payload.data?.instanceId || 'unknown';
    const instanceName = payload.instanceName || payload.data?.instanceName || 'unknown';

    if (Env.EVOLUTION_INSTANCE &&
      instanceId !== Env.EVOLUTION_INSTANCE &&
      instanceName !== Env.EVOLUTION_INSTANCE) {
      return { status: 'ignored_unauthorized_instance' };
    }

    if (['MESSAGE', 'MESSAGES.UPSERT'].includes(normalizedEvent)) {
      const messageData = normalizedEvent === 'MESSAGES.UPSERT' ? payload.data?.data : (payload.data || payload);
      if (!messageData) return { status: 'no_data' };

      const senderJid = messageData.key?.remoteJid ?? messageData.sender ?? messageData.Info?.Sender;
      const isFromMe = messageData.key?.fromMe ?? messageData.Info?.IsFromMe;
      let sender = senderJid;
      const chat = messageData.Info?.Chat || sender;

      if (sender && !sender.includes('@') && sender.endsWith('.net')) {
        sender = sender.replace('s.whatsapp.net', '@s.whatsapp.net');
      }

      const isGroup = messageData.Info?.IsGroup || sender?.includes('@g.us') || chat?.includes('@g.us');
      if (isGroup || isFromMe) return { status: 'ignored' };

      let content = messageData.message?.conversation || messageData.content || messageData.text;
      if (!content) content = "[Mídia]";

      if (sender && content) {
        await step.run('save-incoming-message', async () => {
          await NotificationService.saveIncomingMessage({
            sender,
            content: String(content),
            instanceId: String(instanceId),
            instanceName: String(instanceName),
          });
        });
      }
    }

    if (['CONNECTION', 'CONNECTED', 'LOGOUT', 'DISCONNECTED'].includes(normalizedEvent)) {
      await step.run('log-connection-state', async () => {
        const isConnected = ['CONNECTED', 'CONNECTION'].includes(normalizedEvent) || payload.data?.state === 'open';
        const state = isConnected ? 'CONNECTED' : 'LOGGED_OUT';
        await NotificationService.logConnectionState(String(instanceId), state, undefined, String(instanceName));
      });
    }

    return { status: 'processed' };
  },
);
