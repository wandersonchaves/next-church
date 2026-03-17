import { pgEnum, pgTable, text, timestamp, varchar, uuid, index, boolean, integer, primaryKey } from 'drizzle-orm/pg-core';

// Enums existentes mantidos...
export const journeyStepEnum = pgEnum('journey_step', [
  'DECISION',
  'CELL',
  'UNIVERSITY_OF_LIFE',
  'ENCOUNTER',
  'LEADERSHIP_TRAINING',
  'RE_ENCOUNTER',
  'SENDING'
]);

export const genderEnum = pgEnum('gender', ['M', 'F']);

// 1. Tabela de Ministérios (Sectors)
export const ministries = pgTable('ministries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  leaderId: uuid('leader_id').references((): any => members.id), // Líder do Ministério
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('ministry_org_idx').on(table.organizationId),
]);

// 2. Tabela de Ligação (Membros <-> Ministérios)
export const memberMinistries = pgTable('member_to_ministries', {
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
  ministryId: uuid('ministry_id').references(() => ministries.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').default('VOLUNTÁRIO'), // Ex: Vocal, Instrumentista, Apoio
  joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.memberId, table.ministryId] }),
  index('member_ministry_idx').on(table.memberId),
]);

// 3. Tabela Principal de Membros (Mantida e atualizada)
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  birthDate: timestamp('birth_date', { mode: 'date' }).notNull(),
  gender: genderEnum('gender').notNull(),
  leaderId: uuid('leader_id').references((): any => members.id),
  lineage: text('lineage').notNull().default(''),
  generationSlot: integer('generation_slot'),
  isBaptized: boolean('is_baptized').default(false).notNull(),
  kidsNotes: text('kids_notes'),
  currentStep: journeyStepEnum('current_step').default('DECISION').notNull(),
  isLeader: boolean('is_leader').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('member_org_idx').on(table.organizationId),
  index('member_leader_idx').on(table.leaderId),
  index('member_lineage_idx').on(table.lineage),
]);

// ... Outras tabelas (memberJourneys, events, notificationLogs, journeyHistory) mantidas conforme definido anteriormente
export const memberJourneys = pgTable('member_journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
  step: journeyStepEnum('step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  validatedById: uuid('validated_by_id').references(() => members.id),
  notes: text('notes'),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }),
  targetStep: journeyStepEnum('target_step'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
});

export const journeyHistory = pgTable('journey_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  oldStep: journeyStepEnum('old_step'),
  newStep: journeyStepEnum('new_step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  notes: text('notes'),
});

// Tabela de Logs de Auditoria
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // ID do Clerk
  userName: text('user_name').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE
  entityType: varchar('entity_type', { length: 50 }).notNull(), // MEMBER, MINISTRY, etc.
  entityName: text('entity_name'), // Nome do membro ou ministério para facilitar leitura
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('audit_org_idx').on(table.organizationId),
  index('audit_created_idx').on(table.createdAt),
]);
