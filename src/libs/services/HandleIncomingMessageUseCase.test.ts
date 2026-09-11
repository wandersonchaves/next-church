import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeMessageWithAI } from '../AIOrchestratorEngine';
import { db } from '../DB';
import { members, notificationLogs } from '../../models/Schema';
import { handleIncomingMessageUseCase } from './HandleIncomingMessageUseCase';
import { WhatsAppService } from './WhatsAppService';

// Mocks
vi.mock('../AIOrchestratorEngine', () => ({
  analyzeMessageWithAI: vi.fn(),
}));

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
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates member data and sets status to UPDATED when status is AWAITING_UPDATE and details are provided', async () => {
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

      // Execute usecase
      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Meu e-mail novo é novo@email.com e meu endereço é Rua Principal, 123',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('member_data_corrected');

      // Assert database fields updated
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
      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates member name in place when intent is WRONG_NUMBER with name', async () => {
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

      // Execute use case
      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Não sou a Beatriz, aqui é o João da Silva',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('handled_wrong_number_with_name');

      // Assert member updated in place
      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('João');
      expect(updatedMember?.lastName).toBe('da Silva');
      expect(updatedMember?.phone).toBe(testPhone);

      // Cleanup
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
          message: expect.stringContaining('Poderia nos dizer qual é o seu nome?'),
        }),
      );

      // Cleanup
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

      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates name and asks for opt-in when status is AWAITING_UPDATE and only name is provided', async () => {
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

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Natalia Chaves',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('name_updated_awaiting_opt_in');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Natalia');
      expect(updatedMember?.lastName).toBe('Chaves');
      expect(updatedMember?.status).toBe('AWAITING_UPDATE');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Prazer em conhecer você, *Natalia Chaves*!'),
        }),
      );

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
          message: expect.stringContaining('Cadastro Atualizado!'),
        }),
      );

      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('corrects member name when member introduces themselves with Me chamo Wanderson', async () => {
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

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('member_data_corrected');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.lastName).toBe('');
      expect(updatedMember?.status).toBe('ACTIVE');

      expect(WhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: testJid,
          message: expect.stringContaining('Wanderson'),
        }),
      );

      await db.delete(members).where(eq(members.id, testMember.id));
    });

    it('updates member name even if AI classifies intent as OTHER when detectedName is different', async () => {
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

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson Chaves',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('member_data_corrected');

      const [updatedMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, testMember.id));

      expect(updatedMember?.firstName).toBe('Wanderson');
      expect(updatedMember?.lastName).toBe('Chaves');
      expect(updatedMember?.status).toBe('ACTIVE');

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

      const [log] = await db
        .insert(notificationLogs)
        .values({
          organizationId: testOrgId,
          memberId: testMember.id,
          type: 'WHATSAPP_OUTGOING',
          status: 'SENT',
          content: 'Olá Gabriel!',
          sentAt: new Date(),
        })
        .returning();

      const res = await handleIncomingMessageUseCase({
        sender: testJid,
        content: 'Me chamo Wanderson',
        organizationId: testOrgId,
      });

      expect(res.status).toBe('skipped_recent_outgoing');
      expect(WhatsAppService.sendMessage).not.toHaveBeenCalled();

      await db.delete(notificationLogs).where(eq(notificationLogs.id, log.id));
      await db.delete(members).where(eq(members.id, testMember.id));
    });
  });
});
