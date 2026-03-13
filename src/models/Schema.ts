import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// 1. Enums para Integridade de Domínio
export const journeyStepEnum = pgEnum('journey_step', [
  'DECISION',
  'CELL',
  'UNIVERSITY_OF_LIFE',
  'ENCOUNTER',
  'LEADERSHIP_TRAINING',
  'RE_ENCOUNTER',
  'SENDING',
]);

export const genderEnum = pgEnum('gender', ['M', 'F']);

// 2. Tabela Principal de Membros
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(), // Clerk Organization ID

  // Identidade
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  birthDate: timestamp('birth_date', { mode: 'date' }).notNull(),
  gender: genderEnum('gender').notNull(),

  // Hierarquia G12 (Hybrid: Adjacency List + Materialized Path)
  leaderId: uuid('leader_id').references((): any => members.id),
  lineage: text('lineage').notNull().default(''), // Ex: "uuid1.uuid2.uuid3"
  generationSlot: integer('generation_slot'), // 1 a 12 (F1-F12)

  // Trilha Kids e Metadados
  isBaptized: boolean('is_baptized').default(false).notNull(),
  kidsNotes: text('kids_notes'),

  // Status Geral (Simplificado para o Dashboard principal)
  currentStep: journeyStepEnum('current_step').default('DECISION').notNull(),
  isLeader: boolean('is_leader').default(false).notNull(),

  // Auditoria
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, table => [
  index('member_org_idx').on(table.organizationId),
  index('member_leader_idx').on(table.leaderId),
  index('member_lineage_idx').on(table.lineage),
]);

// 3. Histórico Detalhado da Jornada (Passos Concluídos)
export const memberJourneys = pgTable('member_journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),

  step: journeyStepEnum('step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),

  // Quem validou a conclusão deste passo
  validatedById: uuid('validated_by_id').references(() => members.id),
  notes: text('notes'),
}, table => [
  index('journey_org_idx').on(table.organizationId),
  index('journey_member_idx').on(table.memberId),
]);

// Mantemos journeyHistory para retrocompatibilidade ou logs simples se necessário,
// mas o memberJourneys agora é a fonte de verdade para a trilha concluída.
export const journeyHistory = pgTable('journey_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  oldStep: journeyStepEnum('old_step'),
  newStep: journeyStepEnum('new_step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  notes: text('notes'),
});
