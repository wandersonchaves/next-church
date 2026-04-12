import { db } from '@/libs/DB';
import { members } from '@/models/Schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { inngest } from '@/libs/Inngest';
import { WhatsAppService } from './WhatsAppService';
import { getWeeklySummary } from './AuditService';
import { clerkClient } from '@clerk/nextjs/server';
import { AppConfig } from '@/utils/AppConfig';

/**
 * Helper para buscar o nome da igreja no Clerk.
 */
async function getChurchName(orgId: string) {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return org.name || 'Filadelfia';
  } catch {
    return 'Filadelfia';
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
        .where(and(eq(members.id, memberId), eq(members.organizationId, organizationId)))
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
        .where(and(eq(members.id, memberId), eq(members.organizationId, organizationId)))
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
        sql`EXTRACT(DAY FROM ${members.birthDate}) = EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(MONTH FROM ${members.birthDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`
      );
    });

    for (const member of membersList) {
      if (member.phone) {
        const churchName = await step.run(`get-church-${member.id}`, async () => await getChurchName(member.organizationId));
        await step.run(`send-birthday-msg-${member.id}`, async () => {
          const msg = `Feliz aniversário, ${member.firstName}! 🎉 Toda a família *${churchName}* celebra a sua vida hoje. Que Deus te abençoe grandemente! ✨`;
          await WhatsAppService.sendMessage(member.phone!, msg, member.organizationId);
        });
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
      const conditions = [eq(members.organizationId, organizationId)];
      
      if (filters.currentStep) {
        conditions.push(eq(members.currentStep, filters.currentStep));
      }
      
      if (filters.generationSlot) {
        conditions.push(eq(members.generationSlot, Number(filters.generationSlot)));
      }

      return await db.select().from(members).where(and(...conditions));
    });

    // 2. Envio individual com throttling
    for (const member of recipients) {
      if (member.phone) {
        // Personalização básica: substitui {name} pelo primeiro nome
        const personalizedMessage = message.replace(/\{name\}/g, member.firstName);

        await step.run(`send-${member.id}`, async () => {
          await WhatsAppService.sendMessage(member.phone!, personalizedMessage, organizationId);
        });

        // Intervalo de segurança para não ser banido pelo WhatsApp (Throttling)
        await step.sleep(`wait-${member.id}`, '2s');
      }
    }

    return { totalSent: recipients.length };
  },
);
