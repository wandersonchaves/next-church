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
  { id: 'on-member-created', name: 'Novo Membro: Boas-vindas' },
  { event: 'member/created' },
  async ({ event, step }) => {
    const { memberId, organizationId } = event.data;

    const churchName = await step.run('get-church-name', async () => await getChurchName(organizationId));

    const member = await step.run('fetch-member', async () => {
      const [result] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.id, memberId), 
          eq(members.organizationId, organizationId),
          isNull(members.deletedAt) // Valida se não foi excluído
        ))
        .limit(1);
      return result;
    });

    if (member?.phone) {
      await step.run('send-whatsapp', async () => {
        const welcomeMessage = `Olá ${member.firstName}! Seja muito bem-vindo(a) à família *${churchName}*. Estamos felizes com sua decisão! 🙌`;
        await WhatsAppService.sendMessage(member.phone!, welcomeMessage, organizationId);
      });
    }

    return { status: 'welcome_sent' };
  },
);

/**
 * Evento: Conclusão de Passo da Jornada.
 */
export const onStepCompleted = inngest.createFunction(
  { id: 'on-step-completed', name: 'Jornada: Parabéns pelo Passo' },
  { event: 'member/step.completed' },
  async ({ event, step }) => {
    const { memberId, organizationId, newStep } = event.data;

    const churchName = await step.run('get-church-name', async () => await getChurchName(organizationId));

    const member = await step.run('fetch-member', async () => {
      const [result] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.id, memberId), 
          eq(members.organizationId, organizationId),
          isNull(members.deletedAt) // Valida se não foi excluído
        ))
        .limit(1);
      return result;
    });

    if (member?.phone) {
      await step.run('send-congrats', async () => {
        const message = `Parabéns ${member.firstName}! Você concluiu o passo *${newStep.replace(/_/g, ' ')}* na jornada da *${churchName}*. Continue firme! ✨`;
        await WhatsAppService.sendMessage(member.phone!, message, organizationId);
      });
    }
  },
);

/**
 * Cron Job: Relatório Semanal de Atividades.
 * Roda toda Segunda-feira às 08:00 AM (Brasília).
 */
export const weeklyLeadershipReport = inngest.createFunction(
  { id: "weekly-leadership-report", name: "Cron: Relatório Semanal" },
  { cron: "0 11 * * 1" }, // 11:00 UTC = 08:00 AM Brasil (Segunda)
  async ({ step }) => {
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

            await WhatsAppService.sendMessage(pastor.phone!, message, org.id);
          });
          
          // Pequeno atraso entre organizações para evitar picos
          await step.sleep(`wait-org-${org.id}`, '3s');
        }
      }
    }
  }
);

/**
 * Cron Job: Verificação diária de aniversariantes em 09:15 AM (Brasília).
 */
export const dailyBirthdayCheck = inngest.createFunction(
  { id: "daily-birthday-check", name: "Cron: Parabéns Aniversariantes" },
  { cron: "15 12 * * *" }, // 12:15 UTC = 09:15 AM Brasil
  async ({ step }) => {
    const membersList = await step.run("fetch-birthday-members", async () => {
      return await db.select().from(members).where(
        and(
          sql`EXTRACT(DAY FROM ${members.birthDate}) = EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(MONTH FROM ${members.birthDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          isNull(members.deletedAt) // 🛡️ SEGURANÇA: Não parabenizar membros excluídos
        )
      );
    });

    for (const member of membersList) {
      if (member.phone) {
        await step.run(`send-birthday-msg-${member.id}`, async () => {
          const msg = `Que dia especial! Feliz aniversário ${member.firstName} 😃 Nós do TelePaz Filadélfia ✨ desejamos um novo ano abençoado. Celebramos sua vida, pois você é importante para Deus e para nós. Que o Senhor abençoe você e toda a sua família. 🙌🏼✨`;
          await WhatsAppService.sendMessage(member.phone!, msg, member.organizationId);
        });

        // Throttling para aniversariantes: 5-10s entre mensagens
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
  { id: 'send-broadcast', name: 'Comunicação: Transmissão em Massa' },
  { event: 'notification/broadcast.send' },
  async ({ event, step }) => {
    const { organizationId, filters, message } = event.data;

    // 1. Busca os membros com base nos filtros
    const recipients = await step.run('fetch-recipients', async () => {
      const conditions = [
        eq(members.organizationId, organizationId),
        isNull(members.deletedAt) // 🛡️ SEGURANÇA: Ignora membros excluídos
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

    // 2. Envio individual com throttling e proteção de número novo
    let count = 0;
    for (const member of recipients) {
      if (member.phone) {
        count++;
        
        // Personalização básica: substitui {name} pelo primeiro nome
        const personalizedMessage = message.replace(/\{name\}/g, member.firstName);

        await step.run(`send-${member.id}`, async () => {
          const result: any = await WhatsAppService.sendMessage(member.phone!, personalizedMessage, organizationId);
          
          // Captura o ID da mensagem de forma segura (Evolution GO v2 ou v1)
          const msgId = result?.key?.id || result?.data?.key?.id || result?.data?.id;

          // Salva o log da mensagem enviada para permitir o vínculo de respostas depois
          await NotificationService.saveOutgoingMessage({
            phone: member.phone!,
            content: personalizedMessage,
            organizationId: organizationId,
            status: msgId ? 'SENT' : 'FAILED',
            externalId: msgId,
          });
        });

        // A cada 30 mensagens, faz uma pausa maior de 2 minutos (Batch cooldown)
        if (count % 30 === 0) {
          await step.sleep(`batch-pause-${count}`, '2m');
        } else {
          // Throttling agressivo e aleatório: entre 8 e 20 segundos por mensagem
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
  { id: 'on-whatsapp-webhook-final', name: 'WhatsApp: Webhook Engine' },
  { event: 'whatsapp/webhook.received' },
  async ({ event, step }) => {
    console.log("🔥 [INNGEST_TRIGGER] Função iniciada com sucesso!");
    
    // Pegamos do data (que contém o body do webhook) ou diretamente do payload do evento
    const payload = event.data;
    const normalizedEvent = (payload.normalizedEvent || payload.event || '').toUpperCase();
    
    // Extração robusta de instância (Pode estar no topo ou dentro de data)
    const instanceId = payload.instanceId || payload.data?.instanceId || 'unknown';
    const instanceName = payload.instanceName || payload.data?.instanceName || 'unknown';

    // FILTRO DE SEGURANÇA: Só processa se a instância bater com a configurada
    // Se a variável EVOLUTION_INSTANCE não estiver definida, processamos tudo (fallback)
    if (Env.EVOLUTION_INSTANCE && 
        instanceId !== Env.EVOLUTION_INSTANCE && 
        instanceName !== Env.EVOLUTION_INSTANCE) {
      console.log(`[INNGEST] Ignoring webhook from unauthorized instance: ${instanceId}/${instanceName}. Expected: ${Env.EVOLUTION_INSTANCE}`);
      return { status: 'ignored_unauthorized_instance' };
    }

    console.log(`[INNGEST] Processing WhatsApp Webhook: ${normalizedEvent} for Instance: ${instanceId} (${instanceName})`);

    // Processamento de Mensagens
    if (['MESSAGE', 'MESSAGES.UPSERT'].includes(normalizedEvent)) {
      // Evolution v2 envia os dados no topo do payload.data se for MESSAGE
      // Baileys v1 envia em data.data se for UPSERT
      const messageData = normalizedEvent === 'MESSAGES.UPSERT' ? payload.data?.data : (payload.data || payload);
      
      if (!messageData) {
        console.warn('[INNGEST] No message data found in payload');
        return { status: 'no_data' };
      }

      const senderJid = messageData.key?.remoteJid ?? messageData.sender ?? messageData.Info?.Sender;
      const isFromMe = messageData.key?.fromMe ?? messageData.Info?.IsFromMe;
      let sender = senderJid;
      const chat = messageData.Info?.Chat || sender;

      // Normalização de Sender
      if (sender && !sender.includes('@') && sender.endsWith('.net')) {
        sender = sender.replace('s.whatsapp.net', '@s.whatsapp.net');
      }

      const isGroup = messageData.Info?.IsGroup || sender?.includes('@g.us') || chat?.includes('@g.us');
      const isStatusOrNewsletter = chat?.includes('status') || chat?.includes('newsletter');
      
      const msg = messageData.message || messageData.Message;
      
      if (isGroup || isStatusOrNewsletter) {
        console.log(`[INNGEST] Ignoring group/newsletter/status message from: ${sender}`);
        return { status: 'ignored_group_or_newsletter' };
      }

      if (isFromMe) {
        console.log(`[INNGEST] Ignoring message from self: ${sender}`);
        return { status: 'ignored_from_me' };
      }

      let content = msg?.conversation || 
                      msg?.extendedTextMessage?.text ||
                      msg?.imageMessage?.caption ||
                      msg?.videoMessage?.caption ||
                      messageData.content || 
                      messageData.text;

      if (!content && msg?.protocolMessage) content = "[Mensagem de Sistema]";
      if (!content) content = "[Mídia]";

      const externalId = messageData.key?.id ?? messageData.Info?.ID;
      const contextInfo = msg?.extendedTextMessage?.contextInfo || msg?.imageMessage?.contextInfo || msg?.videoMessage?.contextInfo;
      const parentExternalId = contextInfo?.stanzaId || contextInfo?.quotedMessage?.key?.id;

      if (sender && content) {
        await step.run('save-incoming-message', async () => {
          await NotificationService.saveIncomingMessage({
            sender,
            content: String(content),
            instanceId: String(instanceId || ''),
            instanceName: String(instanceName || ''),
            externalId: String(externalId || ''),
            parentExternalId: String(parentExternalId || ''),
          });
        });
      }
    }

    // Processamento de Conexão
    if (['CONNECTION', 'CONNECTION_UPDATE', 'CONNECTED', 'LOGOUT', 'DISCONNECTED'].includes(normalizedEvent)) {
      await step.run('log-connection-state', async () => {
        const isConnected = ['CONNECTED', 'CONNECTION'].includes(normalizedEvent) || payload.data?.state === 'open';
        const state = isConnected ? 'CONNECTED' : 'LOGGED_OUT';
        await NotificationService.logConnectionState(String(instanceId || ''), state, undefined, String(instanceName || ''));
      });
    }

    return { status: 'processed', event: normalizedEvent };
  },
);
