import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// 1. Enums de Domínio
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
}, table => [
  index('member_org_idx').on(table.organizationId),
  index('member_leader_idx').on(table.leaderId),
  index('member_lineage_idx').on(table.lineage),
]);

// 3. Histórico Detalhado da Jornada
export const memberJourneys = pgTable('member_journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
  step: journeyStepEnum('step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  validatedById: uuid('validated_by_id').references(() => members.id),
  notes: text('notes'),
}, table => [
  index('journey_org_idx').on(table.organizationId),
  index('journey_member_idx').on(table.memberId),
]);

// 4. Agenda da Igreja
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
}, table => [
  index('event_org_idx').on(table.organizationId),
  index('event_date_idx').on(table.startDate),
]);

// 5. Log de Notificações
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // SMS, EMAIL, WHATSAPP
  status: varchar('status', { length: 20 }).notNull(), // SENT, FAILED
  content: text('content').notNull(),
  sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
}, table => [
  index('notif_org_idx').on(table.organizationId),
  index('notif_member_idx').on(table.memberId),
]);

// Log de Auditoria Simples (Histórico)
export const journeyHistory = pgTable('journey_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  oldStep: journeyStepEnum('old_step'),
  newStep: journeyStepEnum('new_step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  notes: text('notes'),
});
