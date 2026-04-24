import { pgEnum, pgTable, text, timestamp, varchar, uuid, index, boolean, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Enums para consistência de dados
 */
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

/**
 * Tabelas do Sistema
 */

// 1. Ministérios
export const ministries = pgTable('ministries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  leaderId: uuid('leader_id').references((): any => members.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('ministry_org_idx').on(table.organizationId),
]);

// 2. Membros <-> Ministérios
export const memberMinistries = pgTable('member_to_ministries', {
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
  ministryId: uuid('ministry_id').references(() => ministries.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').default('VOLUNTÁRIO'),
  joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.memberId, table.ministryId] }),
  index('member_ministry_idx').on(table.memberId),
]);

// 3. Membros
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
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
}, (table) => [
  index('member_org_idx').on(table.organizationId),
  index('member_leader_idx').on(table.leaderId),
  index('member_lineage_idx').on(table.lineage),
]);

// 4. Detalhes da Jornada (Conclusão de Passos)
export const memberJourneys = pgTable('member_journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
  step: journeyStepEnum('step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  validatedById: uuid('validated_by_id').references(() => members.id),
  notes: text('notes'),
});

// 5. Logs de Notificação (WhatsApp In/Out)
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  memberId: uuid('member_id').references(() => members.id), // Removido .notNull()
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  content: text('content').notNull(),
  instanceId: varchar('instance_id', { length: 100 }), // ID da instância no Evolution (UUID ou Nome)
  instanceName: varchar('instance_name', { length: 100 }), // Nome da instância no Evolution
  externalId: text('external_id'), // ID da mensagem no WhatsApp (ex: 3AC2ACC2...)
  parentExternalId: text('parent_external_id'), // ID da mensagem que está sendo respondida (quoted)
  sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
});

// 6. Histórico Simples da Jornada
export const journeyHistory = pgTable('journey_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  oldStep: journeyStepEnum('old_step'),
  newStep: journeyStepEnum('new_step').notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  notes: text('notes'),
});

// 7. Auditoria
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  userName: text('user_name').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityName: text('entity_name'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('audit_org_idx').on(table.organizationId),
  index('audit_created_idx').on(table.createdAt),
]);

/**
 * Relacionamentos (Drizzle Relations API)
 */

export const membersRelations = relations(members, ({ one, many }) => ({
  leader: one(members, {
    fields: [members.leaderId],
    references: [members.id],
    relationName: 'leader_member',
  }),
  disciples: many(members, { relationName: 'leader_member' }),
  notifications: many(notificationLogs),
  journeys: many(memberJourneys),
}));

export const memberJourneysRelations = relations(memberJourneys, ({ one }) => ({
  member: one(members, {
    fields: [memberJourneys.memberId],
    references: [members.id],
  }),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  member: one(members, {
    fields: [notificationLogs.memberId],
    references: [members.id],
  }),
}));
