import { sql, ilike, and, eq, count, or } from 'drizzle-orm';
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
  children: G12Node[];
};

/**
 * Busca a hierarquia G12 filtrada (global ou sub-rede).
 */
export const getFilteredG12Hierarchy = async (orgId: string, search?: string, step?: string, rootId?: string) => {
  const query = sql`
    WITH RECURSIVE g12_tree AS (
      -- 1. Identificamos as raízes (Se rootId for passado, ele é a raiz, senão quem não tem líder)
      SELECT 
        id, first_name, last_name, leader_id, current_step, 
        1 as level, generation_slot, created_at,
        ARRAY[created_at::text] as sort_path
      FROM ${members}
      WHERE organization_id = ${orgId} 
      AND ${rootId ? sql`id = ${rootId}` : sql`leader_id IS NULL`}

      UNION ALL

      -- 2. Buscamos os discípulos recursivamente
      SELECT 
        m.id, m.first_name, m.last_name, m.leader_id, m.current_step, 
        t.level + 1, m.generation_slot, m.created_at,
        t.sort_path || m.created_at::text
      FROM ${members} m
      INNER JOIN g12_tree t ON m.leader_id = t.id
      WHERE m.organization_id = ${orgId}
    )
    SELECT * FROM g12_tree 
    WHERE 1=1
    ${search ? sql` AND (first_name || ' ' || last_name) ILIKE ${`%${search}%`}` : sql``}
    ${step ? sql` AND current_step = ${step}` : sql``}
    ORDER BY sort_path ASC;
  `;

  const result = await db.execute(query);

  return (result.rows as any[]).map(row => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    leaderId: row.leader_id,
    currentStep: row.current_step,
    level: Number(row.level),
    generationSlot: row.generation_slot ? Number(row.generation_slot) : null,
  })) as Omit<G12Node, 'children'>[];
};

export const getG12Hierarchy = async (orgId: string) => getFilteredG12Hierarchy(orgId);

export const getStatsByGeneration = async (orgId: string) => {
  return await db
    .select({ slot: members.generationSlot, count: count() })
    .from(members)
    .where(and(eq(members.organizationId, orgId), sql`${members.generationSlot} IS NOT NULL`))
    .groupBy(members.generationSlot)
    .orderBy(members.generationSlot);
};

export const getG12Stats = async (orgId: string) => {
  return await db
    .select({ current_step: members.currentStep, count: count() })
    .from(members)
    .where(eq(members.organizationId, orgId))
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
    .where(and(eq(members.organizationId, orgId), eq(members.generationSlot, slot)))
    .orderBy(members.firstName);
};
