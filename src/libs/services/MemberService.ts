import { sql } from 'drizzle-orm';
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
 * Busca a hierarquia G12 de forma otimizada e sem duplicatas, suportando filtros.
 * @param orgId - O ID da organização no Clerk.
 * @param search - Termo de busca opcional para filtrar por nome.
 * @param step - Passo da jornada opcional para filtrar.
 */
export const getFilteredG12Hierarchy = async (orgId: string, search?: string, step?: string) => {
  const query = sql`
    WITH RECURSIVE g12_tree AS (
      -- 1. Identificamos as raízes (membros que não têm líder dentro da organização)
      SELECT 
        id, first_name, last_name, leader_id, current_step, 
        1 as level, generation_slot, created_at,
        ARRAY[created_at::text] as sort_path
      FROM ${members}
      WHERE organization_id = ${orgId} AND leader_id IS NULL

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

/**
 * Busca a hierarquia G12 completa de uma organização.
 * Alias para getFilteredG12Hierarchy sem filtros.
 * @param orgId - O ID da organização no Clerk.
 */
export const getG12Hierarchy = async (orgId: string) => {
  return getFilteredG12Hierarchy(orgId);
};

/**
 * Busca estatísticas agregadas (KPIs).
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
