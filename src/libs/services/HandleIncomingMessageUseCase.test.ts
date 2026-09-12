import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { members, notificationLogs } from '../../models/Schema';
import { analyzeMessageWithAI } from '../AIOrchestratorEngine';
import { db } from '../DB';
import { handleIncomingMessageUseCase } from './HandleIncomingMessageUseCase';
import { WhatsAppService } from './WhatsAppService';

// Mocks
vi.mock('../AIOrchestratorEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../AIOrchestratorEngine')>();
  return {
    ...actual,
    analyzeMessageWithAI: vi.fn(),
  };
});

vi.mock('./WhatsAppService', () => ({
  WhatsAppService: {
    sendMessage: vi.fn().mockResolvedValue({ sent: true }),
  },
}));

describe('handleIncomingMessageUseCase', () => {
  const testOrgId = 'test-org-id';
  let testPhone = '';
  let testJid = '';

  beforeEach(() => {
    vi.clearAllMocks();
    testPhone = `5586${Math.floor(90000000 + Math.random() * 9999999)}`;
    testJid = `${testPhone}@s.whatsapp.net`;
  });

  describe('when member exists', () => {
    it('sets status to AWAITING_UPDATE and asks for data when intent is OUTDATED_DATA', async () => {
      // Setup: Seed a member in ACTIVE status
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Wanderson',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      // Mock AI response
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        isDifferentPerson: false,
        rawDetails: 'User wants to update data',
      });

      // Execute use case
      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Mudei meu email',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('awaiting_update_prompt_sent');

      // Assert status updated in DB
      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.status).toBe('AWAITING_UPDATE');

      // Assert WhatsApp message sent
      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Qual seria o seu nome completo, e-mail ou endereço'),
        }),
      );

      // Cleanup
      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('sends confirmation prompt when details are provided and updates member data only upon user confirmation', async () => {
      // Setup: Member awaiting update
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Wanderson',
          lastName: 'Chaves',
          phone: testPhone,
          email: 'velho@email.com',
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      // Mock AI extraction response
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: 'Wanderson Chaves Novo',
        detectedEmail: 'novo@email.com',
        detectedAddress: 'Rua Principal, 123',
        isDifferentPerson: false,
      });

      // Execute usecase - Step 1: User provides data
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Meu e-mail novo é novo@email.com e meu endereço é Rua Principal, 123',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('member_data_corrected');

      // Assert database fields NOT updated before user confirmation
      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.firstName).toBe('Wanderson');
      expect(pendingMember?.lastName).toBe('Chaves');
      expect(pendingMember?.email).toBe('velho@email.com');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      // Execute usecase - Step 2: User confirms with "Sim"
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.lastName).toBe('Chaves Novo');
      expect(updatedMember?.email).toBe('novo@email.com');
      expect(updatedMember?.address).toBe('Rua Principal, 123');
      expect(updatedMember?.status).toBe('ACTIVE');

      // Cleanup
      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('sends confirmation prompt and updates member name only upon user confirmation when intent is WRONG_NUMBER with name', async () => {
      // Setup: Member
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Beatriz',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'F',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      // Mock AI wrong number response with new name
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'WRONG_NUMBER',
        detectedName: 'João da Silva',
        isDifferentPerson: true,
        rawDetails: 'Not Beatriz',
      });

      // Execute use case - Step 1: User says it is wrong number and gives name
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não sou a Beatriz, aqui é o João da Silva',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('handled_wrong_number_with_name');

      // Assert member NOT updated yet in database before confirmation
      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.firstName).toBe('Beatriz');
      expect(pendingMember?.lastName).toBe('Chaves');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      // Step 2: User confirms
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('João');
      expect(updatedMember?.lastName).toBe('da Silva');
      expect(updatedMember?.status).toBe('ACTIVE');

      // Cleanup
      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('sets status to AWAITING_UPDATE on existing member when intent is WRONG_NUMBER without name', async () => {
      // Setup: Member
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Beatriz',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'F',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      // Mock AI wrong number response without name (e.g., "Não me chamo Beatriz")
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'WRONG_NUMBER',
        detectedName: undefined,
        isDifferentPerson: true,
        rawDetails: 'Not Beatriz',
      });

      // Execute use case
      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não me chamo Beatriz',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('handled_wrong_number_awaiting_name');

      // Assert member status changed to AWAITING_UPDATE in place
      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.status).toBe('AWAITING_UPDATE');
      expect(updatedMember?.phone).toBe(testPhone);

      // Assert WhatsApp message sent asking for name
      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Poderia nos dizer qual é o seu nome'),
        }),
      );

      // Cleanup
      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('sets status to OPT_OUT when user rejects receiving messages', async () => {
      // Setup: Member awaiting update
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Natália',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'F',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      // Mock AI extraction response with Opt-Out = false
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OTHER',
        detectedOptIn: false,
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não quero receber nada',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('handled_opt_out');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.deletedAt).not.toBeNull();

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('asks for confirmation and opt-in without mutating DB when status is AWAITING_UPDATE and only name is provided, then updates upon confirmation', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Nataly',
          lastName: 'Ramos',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'F',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'WRONG_NUMBER',
        detectedName: 'Natalia Chaves',
        isDifferentPerson: true,
      });

      // Step 1: user sends name
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Natalia Chaves',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('name_updated_awaiting_opt_in');

      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      // Assert DB fields NOT changed yet before confirmation
      expect(pendingMember?.firstName).toBe('Nataly');
      expect(pendingMember?.lastName).toBe('Ramos');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Natalia Chaves'),
        }),
      );

      // Step 2: user confirms
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Natalia');
      expect(updatedMember?.lastName).toBe('Chaves');
      expect(updatedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('activates member and sends welcome message when status is AWAITING_UPDATE and user confirms with Sim', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Natalia',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'F',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.status).toBe('ACTIVE');
      expect(updatedMember?.deletedAt).toBeNull();

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Cadastro Atualizado'),
        }),
      );

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('prompts for correct data and keeps status as AWAITING_UPDATE when user contests proposed data with "Não, está errado"', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Danilo',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: undefined,
        detectedOptIn: null,
        isDifferentPerson: false,
      });

      // Step 1: User says the data is wrong
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não, está errado',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('awaiting_data_clarification');

      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.status).toBe('AWAITING_UPDATE');
      expect(pendingMember?.deletedAt).toBeNull();
      expect(pendingMember?.firstName).toBe('Danilo');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Como deveríamos registrar seu nome completo'),
        }),
      );

      // Step 2: User provides the correct name
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: 'Daniel Santos',
        detectedOptIn: null,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Meu nome é Daniel Santos',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Meu nome é Daniel Santos',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('name_updated_awaiting_opt_in');

      // Step 3: User confirms with Sim
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 2000),
      });

      const res3 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res3.status).toBe('awaiting_update_confirmed_opt_in');

      const [confirmedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(confirmedMember?.firstName).toBe('Daniel');
      expect(confirmedMember?.lastName).toBe('Santos');
      expect(confirmedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('treats standalone "Não" as data clarification rather than opt-out when member is in AWAITING_UPDATE', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Danilo',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: undefined,
        detectedOptIn: null,
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('awaiting_data_clarification');

      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.status).toBe('AWAITING_UPDATE');
      expect(pendingMember?.deletedAt).toBeNull();

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('registers opt-out when user explicitly responds with "Parar" while in AWAITING_UPDATE', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Danilo',
          lastName: 'Chaves',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OTHER',
        detectedOptIn: false,
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Parar',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('handled_opt_out');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.status).toBe('UPDATED');
      expect(updatedMember?.deletedAt).not.toBeNull();

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('corrects member name when member introduces themselves with Me chamo Wanderson and confirms', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Contato',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: 'Wanderson',
        isDifferentPerson: false,
      });

      // Step 1: user introduces themselves
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('member_data_corrected');

      // Assert member NOT changed yet in DB before confirmation
      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.firstName).toBe('Gabriel');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Wanderson'),
        }),
      );

      // Step 2: user confirms with Sim
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates member name even if AI classifies intent as OTHER when detectedName is different, upon confirmation', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Silva',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OTHER',
        detectedName: 'Wanderson Chaves',
        isDifferentPerson: false,
      });

      // Step 1: User sends name
      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson Chaves',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('member_data_corrected');

      // Assert DB fields NOT updated before confirmation
      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(pendingMember?.firstName).toBe('Gabriel');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      // Step 2: User confirms
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.lastName).toBe('Chaves');
      expect(updatedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates member name to Wanderson and asks for opt-in when user corrects name from Gabriel in AWAITING_UPDATE, then activates upon confirmation', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Contato',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'WRONG_NUMBER',
        detectedName: 'Wanderson',
        detectedOptIn: null,
        isDifferentPerson: true,
      });

      const res1 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Nao me chamo Gabriel, e sim Wanderson',
        organizationId: testOrgId,
      });

      expect(res1.status).toBe('name_updated_awaiting_opt_in');

      const [pendingMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      // Name remains Gabriel until confirmation
      expect(pendingMember?.firstName).toBe('Gabriel');
      expect(pendingMember?.status).toBe('AWAITING_UPDATE');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Wanderson'),
        }),
      );

      // Step 2: user confirms
      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      await db.insert(notificationLogs).values({
        organizationId: testOrgId,
        memberId: testMember.id,
        type: 'WHATSAPP_INCOMING',
        status: 'RECEIVED',
        content: 'Sim',
        sentAt: new Date(Date.now() + 1000),
      });

      const res2 = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res2.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('processes user Sim response even if sent 5 seconds after outgoing message when incoming log is newer', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Wanderson',
          lastName: '',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'AWAITING_UPDATE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      const pastOutgoing = new Date(Date.now() - 5000);
      await db
        .insert(notificationLogs)
        .values({
          organizationId: testOrgId,
          memberId: testMember.id,
          type: 'WHATSAPP_OUTGOING',
          status: 'SENT',
          content: 'Identificamos a seguinte solicitação de atualização no cadastro:\n👤 *Nome:* Wanderson\n\nVocê confirma esses dados?',
          sentAt: pastOutgoing,
        });

      const incomingNow = new Date();
      await db
        .insert(notificationLogs)
        .values({
          organizationId: testOrgId,
          memberId: testMember.id,
          type: 'WHATSAPP_INCOMING',
          status: 'RECEIVED',
          content: 'Sim',
          sentAt: incomingNow,
        });

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'CONFIRMED',
        detectedOptIn: true,
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Sim',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('awaiting_update_confirmed_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('skips execution when recent outgoing message was already sent within 15 seconds', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Silva',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      await db
        .insert(notificationLogs)
        .values({
          organizationId: testOrgId,
          memberId: testMember.id,
          type: 'WHATSAPP_OUTGOING',
          status: 'SENT',
          content: 'Olá Gabriel!',
          sentAt: new Date(),
        });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('skipped_recent_outgoing');
      expect(WhatsAppService.sendMessage).not.toHaveBeenCalled();

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('ignores religious reply "Amém" from active member without updating name', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Silva',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OTHER',
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Amém',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('other_intent_ignored');
      expect(WhatsAppService.sendMessage).not.toHaveBeenCalled();

      const [unchangedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(unchangedMember?.firstName).toBe('Gabriel');
      expect(unchangedMember?.status).toBe('ACTIVE');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('discards hallucinated religious name from AI and ignores change', async () => {
      const [testMember] = await db
        .insert(members)
        .values({
          organizationId: testOrgId,
          firstName: 'Gabriel',
          lastName: 'Silva',
          phone: testPhone,
          birthDate: new Date('1990-01-01'),
          gender: 'M',
          status: 'ACTIVE',
          currentStep: 'DECISION',
          lineage: '',
        })
        .returning();

      vi.mocked(analyzeMessageWithAI).mockResolvedValue({
        intent: 'OUTDATED_DATA',
        detectedName: 'Amém',
        isDifferentPerson: false,
      });

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Amém',
        organizationId: testOrgId,
      });

      // Since detectedName 'Amém' is invalid and wiped, and content doesn't provide email/address/name, it prompts for data
      expect(res.status).toBe('awaiting_update_prompt_sent');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      // Name should still be Gabriel Silva, NOT Amém
      expect(updatedMember?.firstName).toBe('Gabriel');

      await db.delete(notificationLogs).where(eq(notificationLogs.memberId, testMember.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });
  });
});
