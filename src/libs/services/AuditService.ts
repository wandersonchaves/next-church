import { auth, currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { auditLogs } from '@/models/Schema';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PROMOTE' | 'EXPORT';
export type AuditEntityType = 'MEMBER' | 'MINISTRY' | 'TEAM' | 'LITERACY';

/**
 * Busca o resumo de atividades da última semana.
 * @param orgId - Identificador único da organização.
 * @returns Estatísticas e registros recentes de auditoria.
 */
export async function getWeeklySummary(orgId: string) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(and(
      eq(auditLogs.organizationId, orgId),
      gte(auditLogs.createdAt, oneWeekAgo),
    ))
    .orderBy(desc(auditLogs.createdAt));

  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action === 'CREATE').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    promotes: logs.filter(l => l.action === 'PROMOTE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
  };

  return { stats, logs: logs.slice(0, 5) };
}

/**
 * Registra uma ação de auditoria no banco de dados.
 * @param action - Tipo de ação executada (CREATE, UPDATE, DELETE, etc).
 * @param entityType - Tipo de entidade afetada pela ação (MEMBER, MINISTRY, etc).
 * @param entityName - Nome ou identificação opcional da entidade.
 */
export async function logActivity(
  action: AuditAction,
  entityType: AuditEntityType,
  entityName?: string,
) {
  const { orgId, userId } = await auth();
  const user = await currentUser();

  if (!orgId || !userId || !user) {
    return;
  }

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Usuário';

  try {
    await db.insert(auditLogs).values({
      organizationId: orgId,
      userId,
      userName,
      action,
      entityType,
      entityName,
    });
  } catch (e) {
    console.error('[AUDIT_LOG_ERROR]', e);
  }
}
