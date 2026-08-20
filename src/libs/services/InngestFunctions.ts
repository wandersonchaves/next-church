import { db } from '@/libs/DB';
import { members, notificationLogs } from '@/models/Schema';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { inngest } from '@/libs/Inngest';
import { WhatsAppService } from './WhatsAppService';
import { getWeeklySummary } from './AuditService';
import { clerkClient } from '@clerk/nextjs/server';
import { AppConfig } from '@/utils/AppConfig';
import { NotificationService } from './NotificationService';
import { Env } from '@/libs/Env';
import { EvolutionGoClient } from '@/libs/evolution-go/client';
import { handleIncomingMessageUseCase } from '@/libs/services/HandleIncomingMessageUseCase';

/**
 * Monitor de Conexão WhatsApp.
 * Verifica a cada 1 hora se a instância está conectada.
 * Também disparado no boot do sistema.
 */
export const watchdogWhatsAppConnection = inngest.createFunction(
  { 
    id: "watchdog-whatsapp-connection", 
    name: "Monitor de Conexão WhatsApp",
    triggers: [
      { cron: "0 */3 * * *" },
      { event: "system/connection.check" }
    ]
  },
  async ({ step }) => {
    console.log("🚀 ~ step:", step)
    console.log("🕵️ [WATCHDOG] Iniciando verificação de conexão...");

    const status = await step.run("check-connection", async () => {
      const client = EvolutionGoClient.getInstance();
      const res = await client.getInstanceStatus();
      console.log(`🕵️ [WATCHDOG] Status da instância: ${res.connected ? 'ONLINE' : 'OFFLINE'} | LoggedIn: ${res.loggedIn ? 'SIM' : 'NÃO'}`);
      return res;
    });

    if (!status.connected || !(status as any).loggedIn) {
      // 🛡️ TRAVA DE SEGURANÇA: Só alerta se o último registro for há mais de 2h50m
      const shouldAlert = await step.run("check-cooldown", async () => {
        const lastAlert = await db
          .select({ createdAt: sql`max(created_at)` })
          .from(sql`audit_logs`)
          .where(and(
            eq(sql`entity_id`, Env.EVOLUTION_INSTANCE || 'unknown'),
            eq(sql`action`, 'DISCONNECTED_WATCHDOG')
          ));
        
        if (lastAlert[0]?.createdAt) {
          const lastTime = new Date(lastAlert[0].createdAt as string).getTime();
          const now = new Date().getTime();
          const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
          return hoursPassed >= 2.8; // ~2h48m
        }
        return true;
      });

      if (!shouldAlert) {
        console.log("⏳ [WATCHDOG] Alerta ignorado devido ao Cooldown (menos de 3 horas desde o último).");
        return { status: 'cooldown_active' };
      }

      console.warn("⚠️ [WATCHDOG] Instância indisponível ou deslogada! Iniciando procedimentos de alerta...");

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
  async ({ event, step }: { event: any; step: any }) => {
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
  async ({ event, step }: { event: any; step: any }) => {
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
  async ({ step }) => {
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
        isNull(members.deletedAt),
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

        // 🛡️ Trava de envio duplicado: se já enviou mensagem nos últimos 3 minutos, pula
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        const alreadySent = await step.run(`check-dup-${member.id}`, async () => {
          const recentLog = await db.query.notificationLogs.findFirst({
            where: and(
              eq(notificationLogs.organizationId, organizationId),
              eq(notificationLogs.memberId, member.id),
              eq(notificationLogs.type, 'WHATSAPP_OUTGOING'),
              eq(notificationLogs.status, 'SENT'),
              gte(notificationLogs.sentAt, threeMinutesAgo)
            ),
          });
          return Boolean(recentLog);
        });

        if (alreadySent) {
          console.info(`[BROADCAST_SKIP] Message already sent to ${member.firstName} (${member.phone}) in the last 3 minutes. Skipping duplicate.`);
          continue;
        }

        await step.run(`send-${member.id}`, async () => {
          console.info(`[BROADCAST] Sending message ${count}/${recipients.length} to ${member.firstName} (${member.phone})`);
          const result = await WhatsAppService.sendMessage({
            phone: member.phone!,
            message: personalizedMessage,
            organizationId,
          });

          if (!result.sent) {
            console.warn(`[BROADCAST_WARN] Failed to send message to ${member.firstName}: ${result.error || result.reason}`);
          } else {
            console.info(`[BROADCAST_OK] Dispatched message to ${member.firstName} (ID: ${result.externalId || 'N/A'})`);
          }

          return result;
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

/**
 * Inngest Function: Processa mensagem recebida do WhatsApp com IA.
 * Utiliza debounce de 10s agrupando por remetente.
 */
export const processIncomingMessage = inngest.createFunction(
  {
    id: 'process-incoming-message',
    name: 'WhatsApp: Processa Mensagem com IA',
    triggers: [{ event: 'whatsapp/message.received' }],
    debounce: {
      key: 'event.data.sender',
      period: '10s',
    },
  },
  async ({ event, step }) => {
    const { sender, content, instanceId, instanceName } = event.data;

    // Resolve a organização do membro antes de processar
    const organizationId = await step.run('resolve-organization', async () => {
      const member = await NotificationService.findMemberByPhone(sender);
      if (member?.organizationId) {
        return member.organizationId;
      }

      // Fallback via Audit Logs
      console.log(`[PROCESS_INCOMING_MSG] Audit log lookup fallback for instanceName=${instanceName}`);
      const lastAudit = await db.query.auditLogs.findFirst({
        where: (audit, { or, ilike, and, eq }) => and(
          or(
            instanceId ? ilike(audit.userName, `%${instanceId}%`) : undefined,
            instanceName ? ilike(audit.userName, `%${instanceName}%`) : undefined
          ),
          eq(audit.userId, 'system-evolution-go')
        ),
        orderBy: (audit, { desc }) => [desc(audit.createdAt)],
      });

      if (lastAudit?.organizationId) {
        return lastAudit.organizationId;
      }

      // Fallback padrão
      const firstMember = await db.query.members.findFirst();
      return firstMember?.organizationId || 'system';
    });

    const result = await step.run('execute-handler-use-case', async () => {
      return await handleIncomingMessageUseCase({
        sender,
        content,
        organizationId,
      });
    });

    return { status: 'completed', result };
  }
);
