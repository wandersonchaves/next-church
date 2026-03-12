import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// 7 Passos da Jornada G12
export const journeyStepEnum = pgEnum('journey_step', [
  'DECISION',
  'CONSOLIDATION',
  'ENCOUNTER',
  'POST_ENCOUNTER',
  'SCHOOL_OF_LEADERS',
  'PRE_REENTRY',
  'SENDING',
]);

// Tabela Principal de Membros
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(), // Clerk Organization ID

  // Identidade
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  birthDate: timestamp('birth_date', { mode: 'date' }).notNull(),
  gender: varchar('gender', { length: 1 }).notNull(), // M / F

  // Hierarquia G12 (Adjacency List)
  leaderId: uuid('leader_id').references((): any => members.id),

  // Status e Atributos de Liderança
  currentStep: journeyStepEnum('current_step').default('DECISION').notNull(),
  isLeader: boolean('is_leader').default(false).notNull(),
  generationSlot: integer('generation_slot'), // 1 a 12 (F1-F12)

  // Auditoria
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, table => [
  index('member_org_idx').on(table.organizationId),
  index('member_leader_idx').on(table.leaderId),
]);

// Histórico da Jornada (Audit Trail)
export const journeyHistory = pgTable('journey_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  oldStep: journeyStepEnum('old_step'),
  newStep: journeyStepEnum('new_step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  notes: text('notes'),
});
