import { ilike, sql } from 'drizzle-orm';
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
 * Busca a hierarquia G12 filtrada por nome ou passo da jornada.
 * @param orgId - O ID da organização no Clerk.
 * @param search - Termo de busca para nome do membro.
 * @param step - Passo da jornada para filtrar.
 */
export const getFilteredG12Hierarchy = async (orgId: string, search?: string, step?: string) => {
  const query = sql`
    WITH RECURSIVE g12_tree AS (
      SELECT 
        id, first_name, last_name, leader_id, current_step, 1 as level, generation_slot,
        ARRAY[created_at::text] as sort_path
      FROM ${members}
      WHERE organization_id = ${orgId} 
        AND (leader_id IS NULL OR ${search ? ilike(sql`first_name || ' ' || last_name`, `%${search}%`) : sql`true`})
        ${step ? sql`AND current_step = ${step}` : sql``}

      UNION ALL

      SELECT 
        m.id, m.first_name, m.last_name, m.leader_id, m.current_step, t.level + 1, m.generation_slot,
        t.sort_path || m.created_at::text
      FROM ${members} m
      INNER JOIN g12_tree t ON m.leader_id = t.id
      WHERE m.organization_id = ${orgId}
    )
    SELECT DISTINCT ON (id) * FROM g12_tree ORDER BY id, sort_path ASC;
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

/**
 * Busca a hierarquia G12 completa com ordenação DFS.
 * @param orgId - O ID da organização no Clerk.
 * @param rootLeaderId - O ID do líder raiz (opcional).
 */
export const getG12Hierarchy = async (orgId: string, rootLeaderId?: string) => {
  const rootFilter = rootLeaderId
    ? sql`id = ${rootLeaderId}`
    : sql`leader_id IS NULL`;

  const query = sql`
    WITH RECURSIVE g12_tree AS (
      SELECT 
        id, first_name, last_name, leader_id, current_step, 1 as level, generation_slot,
        ARRAY[created_at::text] as sort_path
      FROM ${members}
      WHERE ${rootFilter} AND organization_id = ${orgId}
      UNION ALL
      SELECT 
        m.id, m.first_name, m.last_name, m.leader_id, m.current_step, t.level + 1, m.generation_slot,
        t.sort_path || m.created_at::text
      FROM ${members} m
      INNER JOIN g12_tree t ON m.leader_id = t.id
      WHERE m.organization_id = ${orgId}
    )
    SELECT * FROM g12_tree ORDER BY sort_path ASC;
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

/**
 * Busca estatísticas agregadas dos membros por passo da jornada.
 * @param orgId - O ID da organização no Clerk.
 */
export const getG12Stats = async (orgId: string) => {
  const result = await db.execute(sql`
    SELECT current_step, count(*) as count
    FROM ${members}
    WHERE organization_id = ${orgId}
    GROUP BY current_step;
  `);
  return result.rows as unknown as { current_step: string; count: number }[];
};
