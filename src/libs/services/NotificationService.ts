
import { db } from '@/libs/DB';
import { members, notificationLogs, auditLogs } from '@/models/Schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';

export const NotificationService = {
  /**
   * Resolves a member and their organization by phone number.
   * Handles Brazil's 9th digit complexity by matching the suffix.
   */
  async findMemberByPhone(phone: string) {
    try {
      if (!phone) return null;
      
      // Remove tudo que não for dígito. 
      // Se for um JID (ex: 558694037788@s.whatsapp.net), removemos o domínio e o que não for número.
      const cleanPhone = String(phone).split('@')[0].replace(/\D/g, '');

      if (cleanPhone.length < 8) return null;

      const suffix = cleanPhone.slice(-8);
      const suffixWithNine = cleanPhone.slice(-9);

      console.log(`[NOTIFICATION_SERVICE] Looking for member with phone suffix: ${suffix} or ${suffixWithNine}`);

      const member = await db.query.members.findFirst({
        where: (members, { or, ilike }) => or(
          ilike(members.phone, `%${suffix}`),
          ilike(members.phone, `%${suffixWithNine}`)
        ),
      });
      
      return member || null;
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
      if (!data.sender || !data.content) {
        console.warn('[NOTIFICATION_SERVICE] Missing sender or content', data);
        return;
      }

      // Extrai o identificador antes do @ ou usa o sender inteiro se não houver @
      const senderId = String(data.sender).includes('@') ? String(data.sender).split('@')[0] : String(data.sender);
      const member = await this.findMemberByPhone(data.sender);

      console.log(`[NOTIFICATION_SERVICE] Processing message from ${senderId}. Member found: ${member ? `${member.firstName} (Org: ${member.organizationId})` : 'NO'}`);

      // Fallback logic aprimorado
      let orgId = member?.organizationId;

      if (!orgId) {
        console.log(`[NOTIFICATION_SERVICE] Member NOT found for ${senderId}. Attempting fallback via Audit Logs for Instance: ${data.instanceId} or ${data.instanceName}`);

        // Tentativa 1: Busca nos logs de auditoria pelo nome ou ID da instância
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

        orgId = lastAudit?.organizationId;

        if (orgId) {
          console.log(`[NOTIFICATION_SERVICE] Fallback organization found in Audit Logs: ${orgId}`);
        }
      }

      if (!orgId) {
        // Tentativa 2: Fallback para a primeira organização do sistema (último recurso)
        const firstMember = await db.query.members.findFirst();
        orgId = firstMember?.organizationId || 'system';
        console.warn(`[NOTIFICATION_SERVICE] CRITICAL: No organization found for message. Using fallback: ${orgId}`);
      }

      const result = await db.insert(notificationLogs).values({
        organizationId: orgId,
        memberId: member?.id || null,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: `${!member ? `[De: ${senderId}] ` : ''}${data.content}`,
        externalId: data.externalId || null,
        parentExternalId: data.parentExternalId || null,
        sentAt: new Date(),
      }).returning();

      console.log(`[NOTIFICATION_SERVICE] Message saved successfully. ID: ${result[0]?.id} for Org: ${orgId}${data.parentExternalId ? ` (Replied to: ${data.parentExternalId})` : ''}`);
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to save message:', error);
      throw error; // Repassa para o Inngest tentar novamente se necessário
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
        externalId: data.externalId,
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
  async getIncomingMessages(organizationId: string, limit = 50) {
    const results = await db.query.notificationLogs.findMany({
      where: and(
        eq(notificationLogs.organizationId, organizationId),
        eq(notificationLogs.type, 'WHATSAPP_INCOMING')
      ),
      orderBy: (notificationLogs, { desc }) => [desc(notificationLogs.sentAt)],
      limit,
      with: {
        member: true,
      },
    });

    console.log(`[NOTIFICATION_SERVICE] Found ${results.length} incoming messages for Org: ${organizationId}`);
    return results;
  },
};
