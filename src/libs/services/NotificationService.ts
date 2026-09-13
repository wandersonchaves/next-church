import { and, eq, gte, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { auditLogs, members, notificationLogs } from '@/models/Schema';

export const NotificationService = {
  /**
   * Resolves a member and their organization by phone number.
   * Handles Brazil's 9th digit complexity by matching the suffix.
   * @param phone - Número de telefone do membro com ou sem DDD/código do país.
   * @returns Membro correspondente ou null se não encontrado.
   */
  async findMemberByPhone(phone: string) {
    try {
      if (!phone) {
        return null;
      }

      // Limpeza profunda: mantém apenas números
      const digits = String(phone).replace(/\D/g, '');

      // Se for JID internacional completo (ex: 5586994037788 ou 558694037788)
      // Removemos o '55' inicial se existir para focar no número local
      const localNumber = digits.startsWith('55') ? digits.slice(2) : digits;

      // Sufixo de 8 dígitos é a âncora mais segura para o Brasil
      const suffix8 = localNumber.slice(-8);

      console.warn(`[NOTIFICATION_SERVICE] Member Lookup: Original=${phone}, Suffix8=${suffix8}`);

      // Busca por sufixo para ignorar o 9º dígito presente ou ausente
      const results = await db
        .select()
        .from(members)
        .where(and(
          ilike(members.phone, `%${suffix8}`),
          isNull(members.deletedAt), // Ignora membros excluídos
        ))
        .limit(1);

      let member = results[0] || null;

      // Fallback: se o número no banco foi zerado anteriormente (phone = null), busca pelo log recente para restaurar o membro
      if (!member) {
        const lastLog = await db
          .select({ memberId: notificationLogs.memberId })
          .from(notificationLogs)
          .where(and(
            ilike(notificationLogs.content, `%${suffix8}%`),
            sql`${notificationLogs.memberId} IS NOT NULL`,
          ))
          .orderBy(sql`${notificationLogs.sentAt} DESC`)
          .limit(1);

        if (lastLog[0]?.memberId) {
          const [healedMember] = await db
            .select()
            .from(members)
            .where(and(
              eq(members.id, lastLog[0].memberId),
              isNull(members.deletedAt),
            ))
            .limit(1);

          if (healedMember) {
            member = healedMember;
            console.warn(`[NOTIFICATION_SERVICE] Restoring phone for member ${member.firstName} (${digits})`);
            await db
              .update(members)
              .set({ phone: digits, updatedAt: new Date() })
              .where(eq(members.id, member.id));
            member.phone = digits;
          }
        }
      }

      console.warn(`[NOTIFICATION_SERVICE] Lookup Result: ${member ? `${member.firstName} (Org: ${member.organizationId})` : 'NOT FOUND'}`);

      return member;
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_PHONE_LOOKUP_ERROR]', error);
      return null;
    }
  },

  /**
   * Persists an incoming message from Evolution GO.
   * @param data - Dados da mensagem recebida via webhook.
   * @param data.sender - Número ou identificador do remetente.
   * @param data.content - Conteúdo de texto da mensagem.
   * @param data.instanceId - Identificador único da instância no Evolution API.
   * @param data.instanceName - Nome amigável opcional da instância.
   * @param data.externalId - ID externo da mensagem no WhatsApp.
   * @param data.parentExternalId - ID da mensagem pai referenciada em caso de resposta.
   * @returns Resultado do processamento e persistência da mensagem.
   */
  async saveIncomingMessage(data: {
    sender: string;
    content: string;
    instanceId: string;
    instanceName?: string;
    externalId?: string;
    parentExternalId?: string;
  }): Promise<{
      success: boolean;
      id?: string;
      organizationId?: string;
      memberId?: string | null;
      duplicate?: boolean;
    }> {
    try {
      const sender = String(data.sender || '');
      const content = String(data.content || '');

      if (!sender || !content) {
        return { success: false };
      }

      console.warn(`[NOTIFICATION_SERVICE] >>> START: Message from ${sender}`);

      const member = await this.findMemberByPhone(sender);
      let orgId: string | undefined = member?.organizationId;

      console.warn(`[NOTIFICATION_SERVICE] >>> STEP 1: Member=${member ? member.firstName : 'NONE'}, Org=${orgId}`);

      // Fallback via Audit Logs se não achou membro
      if (!orgId) {
        console.warn(`[NOTIFICATION_SERVICE] Using Audit Log fallback for Instance: ${data.instanceName}`);
        const lastAudit = await db.query.auditLogs.findFirst({
          where: (audit, { or, ilike, and, eq }) => and(
            or(
              data.instanceId ? ilike(audit.userName, `%${data.instanceId}%`) : undefined,
              data.instanceName ? ilike(audit.userName, `%${data.instanceName}%`) : undefined,
            ),
            eq(audit.userId, 'system-evolution-go'),
          ),
          orderBy: (audit, { desc }) => [desc(audit.createdAt)],
        });
        orgId = (lastAudit?.organizationId as string) || undefined;
      }

      // Fallback Final (último recurso)
      if (!orgId) {
        const firstMember = await db.query.members.findFirst();
        orgId = firstMember?.organizationId || 'system';
      }

      console.warn(`[NOTIFICATION_SERVICE] >>> STEP 2: Final Org=${orgId}. Inserting...`);

      // 🛑 TRAVA DE DUPLICIDADE: Verifica se a mensagem já existe pelo externalId ou nos últimos 10 segundos
      const extId = data.externalId && String(data.externalId).trim() !== '' ? String(data.externalId) : null;

      if (extId) {
        const existing = await db.query.notificationLogs.findFirst({
          where: and(
            eq(notificationLogs.externalId, extId),
            eq(notificationLogs.organizationId, String(orgId)),
          ),
        });

        if (existing) {
          console.warn(`[NOTIFICATION_SERVICE] >>> SKIP: Message ${extId} already exists. Ignoring duplicate.`);
          return {
            success: true,
            organizationId: String(orgId),
            memberId: member?.id || null,
            duplicate: true,
          };
        }
      }

      const recentWindow = new Date(Date.now() - 4 * 1000);
      const incomingContent = `${!member ? `[De: ${sender.split('@')[0]}] ` : ''}${content}`;
      const recentDuplicate = await db.query.notificationLogs.findFirst({
        where: and(
          eq(notificationLogs.organizationId, String(orgId)),
          eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
          eq(notificationLogs.content, incomingContent),
          member?.id ? eq(notificationLogs.memberId, member.id) : ilike(notificationLogs.content, `[De: ${sender.split('@')[0]}]%`),
          gte(notificationLogs.sentAt, recentWindow),
        ),
      });

      if (recentDuplicate) {
        console.warn(`[NOTIFICATION_SERVICE] >>> SKIP: Duplicate incoming message content from ${sender} within last 4s.`);
        return {
          success: true,
          organizationId: String(orgId),
          memberId: member?.id || null,
          duplicate: true,
        };
      }

      const parentId = data.parentExternalId && String(data.parentExternalId).trim() !== '' ? String(data.parentExternalId) : null;

      const [inserted] = await db.insert(notificationLogs).values({
        organizationId: String(orgId),
        memberId: member?.id || null,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: `${!member ? `[De: ${sender.split('@')[0]}] ` : ''}${content}`,
        instanceId: data.instanceId,
        instanceName: data.instanceName,
        externalId: extId,
        parentExternalId: parentId,
        sentAt: new Date(),
      }).returning({ id: notificationLogs.id });

      console.warn(`[NOTIFICATION_SERVICE] >>> STEP 3: SUCCESS! ID=${inserted?.id}`);

      return {
        success: true,
        id: inserted?.id,
        organizationId: String(orgId),
        memberId: member?.id || null,
        duplicate: false,
      };
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_CRITICAL_ERROR]', error);
      throw error;
    }
  },

  /**
   * Persists an outgoing message.
   * @param data - Dados da mensagem enviada para registro de log.
   * @param data.phone - Número de telefone de destino com DDD.
   * @param data.content - Conteúdo de texto da mensagem enviada.
   * @param data.organizationId - Identificador da organização remetente.
   * @param data.status - Status do envio (SENT ou FAILED).
   * @param data.externalId - Identificador externo opcional da mensagem.
   */
  async saveOutgoingMessage(data: {
    phone: string;
    content: string;
    organizationId: string;
    status: 'SENT' | 'FAILED';
    externalId?: string;
  }) {
    const member = await this.findMemberByPhone(data.phone);
    const cleanPhone = data.phone.split('@')[0].replace(/\D/g, '');

    try {
      await db.insert(notificationLogs).values({
        organizationId: data.organizationId,
        memberId: member?.id || null,
        type: 'WHATSAPP_OUTGOING',
        status: data.status,
        content: `${!member ? `[Para: ${cleanPhone}] ` : ''}${data.content}`,
        externalId: data.externalId || null,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to save outgoing log:', error);
    }
  },

  /**
   * Logs connection state changes in the audit log.
   * @param instanceId - Identificador da instância do WhatsApp.
   * @param state - Novo estado da conexão da instância.
   * @param organizationId - Identificador opcional da organização.
   * @param instanceName - Nome amigável opcional da instância.
   */
  async logConnectionState(instanceId: string, state: string, organizationId?: string, instanceName?: string) {
    // Se não passar orgId, tenta o fallback (mas agora o syncWebhookAction passa)
    let orgId = organizationId;

    if (!orgId) {
      const firstMember = await db.query.members.findFirst();
      orgId = firstMember?.organizationId || 'system';
    }

    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        userId: 'system-evolution-go',
        userName: `Instance: ${instanceId}${instanceName ? ` (${instanceName})` : ''}`,
        action: 'UPDATE',
        entityType: 'TEAM',
        entityName: `WhatsApp Connection: ${state}`,
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to log state change:', error);
    }
  },

  /**
   * Fetches recent incoming messages for an organization.
   * @param organizationId - Identificador da organização.
   * @param instanceFilter - Filtro opcional por nome ou id da instância.
   * @param limit - Quantidade máxima de mensagens a retornar.
   * @returns Lista de mensagens recebidas.
   */
  async getIncomingMessages(organizationId: string, instanceFilter?: string, limit = 50) {
    const conditions = [
      eq(notificationLogs.organizationId, organizationId),
      eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
    ];

    // Filtro dinâmico por instância
    if (instanceFilter) {
      conditions.push(
        or(
          ilike(notificationLogs.instanceId, `%${instanceFilter}%`),
          ilike(notificationLogs.instanceName, `%${instanceFilter}%`),
          sql`${notificationLogs.instanceId} IS NULL`, // Mantém mensagens sem instância para evitar perda de histórico
        ) as any,
      );
    }

    const results = await db.query.notificationLogs.findMany({
      where: and(...conditions),
      orderBy: (notificationLogs, { desc }) => [desc(notificationLogs.sentAt)],
      limit,
      with: {
        member: true,
      },
    });

    console.warn(`[NOTIFICATION_SERVICE] Found ${results.length} incoming messages for Org: ${organizationId}${instanceFilter ? ` (Filtered by: ${instanceFilter})` : ''}`);
    return results;
  },

  /**
   * Busca respostas interativas vinculadas a perguntas enviadas.
   * Inteligência: Se não houver vínculo direto (reply), busca a última mensagem enviada.
   * @param organizationId - Identificador da organização para consulta.
   * @param limit - Limite de registros a retornar.
   * @returns Lista de respostas correlacionadas com perguntas.
   */
  async getSurveyResponses(organizationId: string, limit = 50) {
    // 1. Busca mensagens recebidas (Inngest ou Direct)
    const incoming = await db.query.notificationLogs.findMany({
      where: and(
        eq(notificationLogs.organizationId, organizationId),
        eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
      ),
      orderBy: (n, { desc }) => [desc(n.sentAt)],
      limit,
      with: {
        member: true,
      },
    });

    // 2. Correlaciona com a pergunta (contexto)
    const responses = await Promise.all(incoming.map(async (msg) => {
      let question: any = null;

      if (msg.parentExternalId) {
        // Busca por ID direto (Reply oficial)
        question = await db.query.notificationLogs.findFirst({
          where: eq(notificationLogs.externalId, msg.parentExternalId),
        });
      }

      if (!question && msg.memberId) {
        // Fallback: Busca a última mensagem enviada para esse membro ANTES da resposta
        question = await db.query.notificationLogs.findFirst({
          where: and(
            eq(notificationLogs.memberId, msg.memberId),
            eq(notificationLogs.type, 'WHATSAPP_OUTGOING'),
            sql`${notificationLogs.sentAt} < ${msg.sentAt}`,
          ),
          orderBy: (n, { desc }) => [desc(n.sentAt)],
        });
      }

      // Só retornamos se houver uma "pergunta" associada para triagem
      if (!question) {
        return null;
      }

      return {
        id: msg.id,
        member: msg.member,
        question: question.content,
        answer: msg.content,
        sentAt: msg.sentAt,
        externalId: msg.externalId,
      };
    }));

    // Filtra nulos e limita
    return responses.filter((r): r is NonNullable<typeof r> => r !== null).slice(0, limit);
  },
};
