import { sql, ilike, and, eq, count, or, isNull } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { members } from '@/models/Schema';

export type G12Node = {
  id: string;
  firstName: string;
  lastName: string;
  leaderId: string | null;
  leaderName?: string;
  currentStep: string;
  level: number;
  generationSlot: number | null;
  isLeader: boolean;
  isMatch?: boolean;
  children: G12Node[];
};

/**
 * Busca a hierarquia G12 filtrada.
 * A lógica foi aprimorada para manter a estrutura da árvore mesmo com filtros.
 */
export const getFilteredG12Hierarchy = async (orgId: string, search?: string, step?: string, rootId?: string) => {
  const query = sql`
    WITH RECURSIVE g12_tree AS (
      -- 1. Identificamos as raízes
      SELECT 
        id, first_name, last_name, leader_id, current_step, 
        1 as level, generation_slot, is_leader, created_at,
        ARRAY[created_at::text] as sort_path
      FROM ${members}
      WHERE organization_id = ${orgId} 
      AND deleted_at IS NULL
      AND ${rootId ? sql`id = ${rootId}` : sql`leader_id IS NULL`}

      UNION ALL

      -- 2. Buscamos os discípulos recursivamente
      SELECT 
        m.id, m.first_name, m.last_name, m.leader_id, m.current_step, 
        t.level + 1, m.generation_slot, m.is_leader, m.created_at,
        t.sort_path || m.created_at::text
      FROM ${members} m
      INNER JOIN g12_tree t ON m.leader_id = t.id
      WHERE m.organization_id = ${orgId}
      AND m.deleted_at IS NULL
    )
    SELECT *,
      CASE 
        WHEN ${search ? sql`(first_name || ' ' || last_name) ILIKE ${`%${search}%`}` : sql`FALSE`} THEN TRUE
        ELSE FALSE
      END as is_match
    FROM g12_tree 
    ORDER BY sort_path ASC;
  `;

  const result = await db.execute(query);

  const allNodes = (result.rows as any[]).map(row => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    leaderId: row.leader_id,
    currentStep: row.current_step,
    level: Number(row.level),
    generationSlot: row.generation_slot ? Number(row.generation_slot) : null,
    isLeader: Boolean(row.is_leader),
    isMatch: Boolean(row.is_match),
  }));

  // Se houver busca, precisamos garantir que mostramos apenas ramos que contenham o resultado
  if (search || step) {
    const matchedIds = new Set(allNodes.filter(n => n.isMatch || (step && n.currentStep === step)).map(n => n.id));
    
    // Se não achou nada, retorna vazio
    if (matchedIds.size === 0) return [];

    // Sobe a árvore marcando quem deve ser exibido (ancestrais dos matches)
    const visibleIds = new Set<string>(matchedIds);
    let added = true;
    while (added) {
      added = false;
      allNodes.forEach(node => {
        if (node.leaderId && visibleIds.has(node.id) && !visibleIds.has(node.leaderId)) {
          visibleIds.add(node.leaderId);
          added = true;
        }
      });
    }

    return allNodes.filter(n => visibleIds.has(n.id)) as Omit<G12Node, 'children'>[];
  }

  return allNodes as Omit<G12Node, 'children'>[];
};

export const getG12Hierarchy = async (orgId: string) => getFilteredG12Hierarchy(orgId);

export const getStatsByGeneration = async (orgId: string) => {
  return await db
    .select({ slot: members.generationSlot, count: count() })
    .from(members)
    .where(and(
      eq(members.organizationId, orgId), 
      sql`${members.generationSlot} IS NOT NULL`,
      isNull(members.deletedAt)
    ))
    .groupBy(members.generationSlot)
    .orderBy(members.generationSlot);
};

export const getG12Stats = async (orgId: string) => {
  return await db
    .select({ current_step: members.currentStep, count: count() })
    .from(members)
    .where(and(eq(members.organizationId, orgId), isNull(members.deletedAt)))
    .groupBy(members.currentStep);
};

export const getMembersByGenerationSlot = async (orgId: string, slot: number) => {
  return await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      currentStep: members.currentStep,
      phone: members.phone,
      leaderName: sql<string>`leader.first_name || ' ' || leader.last_name`,
    })
    .from(members)
    .leftJoin(sql`${members} as leader`, eq(members.leaderId, sql`leader.id`))
    .where(and(
      eq(members.organizationId, orgId), 
      eq(members.generationSlot, slot),
      isNull(members.deletedAt)
    ))
    .orderBy(members.firstName);
};

/**
 * Realiza a exclusão lógica de um membro.
 */
export const softDeleteMember = async (id: string, orgId: string) => {
  return await db
    .update(members)
    .set({ deletedAt: new Date() })
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)));
};
