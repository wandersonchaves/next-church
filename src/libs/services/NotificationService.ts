
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
      const cleanPhone = String(phone).split('@')[0].replace(/\D/g, '');

      if (cleanPhone.length < 8) return null;

      const suffix = cleanPhone.slice(-8);
      const suffixWithNine = cleanPhone.slice(-9);

      console.log(`[NOTIFICATION_SERVICE] Querying member for phone: ${cleanPhone} (Suffix: ${suffix})`);

      // Usando db.select() em vez de db.query() para maior estabilidade e performance
      const results = await db
        .select()
        .from(members)
        .where(
          or(
            ilike(members.phone, `%${suffix}`),
            ilike(members.phone, `%${suffixWithNine}`)
          )
        )
        .limit(1);
      
      const member = results[0] || null;
      console.log(`[NOTIFICATION_SERVICE] Member lookup result: ${member ? `${member.firstName} (ID: ${member.id})` : 'NOT FOUND'}`);
      
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
      
      if (!sender || !content) {
        console.warn('[NOTIFICATION_SERVICE] Skip: Missing sender or content');
        return;
      }

      const senderId = sender.split('@')[0].replace(/\D/g, '');
      console.log(`[NOTIFICATION_SERVICE] START: Processing message from ${senderId}`);
      
      // Busca direta de membro para evitar overhead de chamada de função se possível
      const suffix = senderId.slice(-8);
      const suffixWithNine = senderId.slice(-9);

      const memberResults = await db
        .select()
        .from(members)
        .where(
          or(
            ilike(members.phone, `%${suffix}`),
            ilike(members.phone, `%${suffixWithNine}`)
          )
        )
        .limit(1);
      
      const member = memberResults[0] || null;
      let orgId: string | undefined = member?.organizationId;

      console.log(`[NOTIFICATION_SERVICE] STEP 1: Member found: ${member ? member.firstName : 'NO'}`);

      // Fallback via Audit Logs se não achou membro
      if (!orgId) {
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

      // Fallback final
      if (!orgId) {
        const firstMember = await db.query.members.findFirst();
        orgId = firstMember?.organizationId || 'system';
      }

      console.log(`[NOTIFICATION_SERVICE] STEP 2: Org resolved: ${orgId}. Inserting...`);

      // Normaliza IDs
      const extId = data.externalId && String(data.externalId).trim() !== '' ? String(data.externalId) : null;
      const parentId = data.parentExternalId && String(data.parentExternalId).trim() !== '' ? String(data.parentExternalId) : null;

      const [inserted] = await db.insert(notificationLogs).values({
        organizationId: String(orgId),
        memberId: member?.id || null,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: `${!member ? `[De: ${senderId}] ` : ''}${content}`,
        externalId: extId,
        parentExternalId: parentId,
        sentAt: new Date(),
      }).returning({ id: notificationLogs.id });

      console.log(`[NOTIFICATION_SERVICE] STEP 3: SUCCESS! Message ID: ${inserted?.id}`);
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
