
import { db } from '@/libs/DB';
import { members, notificationLogs, auditLogs } from '@/models/Schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';

export const NotificationService = {
  /**
   * Resolves a member and their organization by phone number.
   * Handles Brazil's 9th digit complexity by matching the suffix.
   */
  async findMemberByPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const suffix = cleanPhone.slice(-8); // Last 8 digits are most stable

    return await db.query.members.findFirst({
      where: (members, { or, ilike }) => or(
        ilike(members.phone, `%${suffix}`),
        // If the number in DB has the 9th digit and suffix is only 8
        ilike(members.phone, `%${cleanPhone.slice(-9)}`)
      ),
    });
  },

  /**
   * Persists an incoming message from Evolution GO.
   */
  async saveIncomingMessage(data: { sender: string; content: string; instanceId: string }) {
    const phone = data.sender.split('@')[0];
    const member = await this.findMemberByPhone(phone);

    if (!member) {
      console.warn(`[NOTIFICATION_SERVICE] Member not found for phone: ${phone}`);
      return;
    }

    try {
      await db.insert(notificationLogs).values({
        organizationId: member.organizationId,
        memberId: member.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: data.content,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to save message:', error);
    }
  },

  /**
   * Persists an outgoing message.
   */
  async saveOutgoingMessage(data: { phone: string; content: string; organizationId: string; status: 'SENT' | 'FAILED' }) {
    const member = await this.findMemberByPhone(data.phone);
    
    if (!member) return;

    try {
      await db.insert(notificationLogs).values({
        organizationId: data.organizationId,
        memberId: member.id,
        type: 'WHATSAPP_OUTGOING',
        status: data.status,
        content: data.content,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to save outgoing log:', error);
    }
  },

  /**
   * Logs connection state changes in the audit log.
   */
  async logConnectionState(instanceId: string, state: string) {
    // Attempt to find any organization to log this system event
    // In a multi-tenant setup, we might have a dedicated system organization or log to the first one found
    const firstMember = await db.query.members.findFirst();
    const orgId = firstMember?.organizationId || 'system';

    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        userId: 'system-evolution-go',
        userName: `Instance: ${instanceId}`,
        action: 'UPDATE',
        entityType: 'TEAM',
        entityName: `WhatsApp Connection: ${state}`,
      });
    } catch (error) {
      console.error('[NOTIFICATION_SERVICE_ERROR] Failed to log state change:', error);
    }
  }
};
