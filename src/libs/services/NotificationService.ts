
import { db } from '@/libs/DB';
import { members, notificationLogs, auditLogs } from '@/models/Schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';
import { Env } from '@/libs/Env';

export const NotificationService = {
  /**
   * Resolves a member and their organization by phone number.
   * Handles Brazil's 9th digit complexity by matching the suffix.
   */
  async findMemberByPhone(phone: string) {
    try {
      if (!phone) return null;
      
      // Limpeza profunda: mantém apenas números
      const digits = String(phone).replace(/\D/g, '');
      
      // Se for JID internacional completo (ex: 5586994037788 ou 558694037788)
      // Removemos o '55' inicial se existir para focar no número local
      let localNumber = digits.startsWith('55') ? digits.slice(2) : digits;
      
      // Sufixo de 8 dígitos é a âncora mais segura para o Brasil
      const suffix8 = localNumber.slice(-8);

      console.log(`[NOTIFICATION_SERVICE] Member Lookup: Original=${phone}, Suffix8=${suffix8}`);

      // Busca por sufixo para ignorar o 9º dígito presente ou ausente
      const results = await db
        .select()
        .from(members)
        .where(ilike(members.phone, `%${suffix8}`))
        .limit(1);
      
      const member = results[0] || null;
      console.log(`[NOTIFICATION_SERVICE] Lookup Result: ${member ? `${member.firstName} (Org: ${member.organizationId})` : 'NOT FOUND'}`);
      
      return member;
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_PHONE_LOOKUP_ERROR]', error);
      return null;
    }
  },

  /**
   * Persists an incoming message from Evolution GO.
   */
  async saveIncomingMessage(data: { 
    sender: string; 
    content: string; 
    instanceId: string; 
    instanceName?: string;
    externalId?: string;
    parentExternalId?: string;
  }) {
    try {
      const sender = String(data.sender || '');
      const content = String(data.content || '');
      
      if (!sender || !content) return;

      console.log(`[NOTIFICATION_SERVICE] >>> START: Message from ${sender}`);
      
      const member = await this.findMemberByPhone(sender);
      let orgId: string | undefined = member?.organizationId;

      console.log(`[NOTIFICATION_SERVICE] >>> STEP 1: Member=${member ? member.firstName : 'NONE'}, Org=${orgId}`);

      // Fallback via Audit Logs se não achou membro
      if (!orgId) {
        console.log(`[NOTIFICATION_SERVICE] Using Audit Log fallback for Instance: ${data.instanceName}`);
        const lastAudit = await db.query.auditLogs.findFirst({
          where: (audit, { or, ilike, and, eq }) => and(
            or(
              data.instanceId ? ilike(audit.userName, `%${data.instanceId}%`) : undefined,
              data.instanceName ? ilike(audit.userName, `%${data.instanceName}%`) : undefined
            ),
            eq(audit.userId, 'system-evolution-go')
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

      console.log(`[NOTIFICATION_SERVICE] >>> STEP 2: Final Org=${orgId}. Inserting...`);

      // Normaliza IDs
      const extId = data.externalId && String(data.externalId).trim() !== '' ? String(data.externalId) : null;
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

      console.log(`[NOTIFICATION_SERVICE] >>> STEP 3: SUCCESS! ID=${inserted?.id}`);
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_CRITICAL_ERROR]', error);
      throw error;
    }
  },

  /**
   * Persists an outgoing message.
   */
  async saveOutgoingMessage(data: { 
    phone: string; 
    content: string; 
    organizationId: string; 
    status: 'SENT' | 'FAILED';
    externalId?: string;
  }) {
    const member = await this.findMemberByPhone(data.phone);

    if (!member) return;

    try {
      await db.insert(notificationLogs).values({
        organizationId: data.organizationId,
        memberId: member.id,
        type: 'WHATSAPP_OUTGOING',
        status: data.status,
        content: data.content,
        externalId: data.externalId || null,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to save outgoing log:', error);
    }
  },


  /**
   * Logs connection state changes in the audit log.
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
   */
  async getIncomingMessages(organizationId: string, instanceFilter?: string, limit = 50) {
    const conditions = [
      eq(notificationLogs.organizationId, organizationId),
      eq(notificationLogs.type, 'WHATSAPP_INCOMING')
    ];

    // Filtro dinâmico por instância
    if (instanceFilter) {
      conditions.push(
        or(
          ilike(notificationLogs.instanceId, `%${instanceFilter}%`),
          ilike(notificationLogs.instanceName, `%${instanceFilter}%`),
          sql`${notificationLogs.instanceId} IS NULL` // Mantém mensagens sem instância para evitar perda de histórico
        ) as any
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

    console.log(`[NOTIFICATION_SERVICE] Found ${results.length} incoming messages for Org: ${organizationId}${instanceFilter ? ` (Filtered by: ${instanceFilter})` : ''}`);
    return results;
  },
};
