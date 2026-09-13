import { describe, expect, it } from 'vitest';
import { MemberSchema } from './MemberValidation';

describe('MemberValidation', () => {
  describe('MemberSchema', () => {
    const validMember = {
      firstName: 'Wanderson',
      lastName: 'Chaves',
      email: 'wanderson@test.com',
      phone: '86995206925',
      birthDate: '1990-01-01',
      gender: 'M' as const,
      leaderId: '',
      generationSlot: '1',
      currentStep: 'DECISION' as const,
      isBaptized: false,
    };

    it('parses valid member with kidsNotes tag TESTE_PRD', () => {
      const result = MemberSchema.safeParse({
        ...validMember,
        kidsNotes: 'TESTE_PRD',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.kidsNotes).toBe('TESTE_PRD');
      }
    });

    it('parses member without kidsNotes tag as empty or undefined', () => {
      const result = MemberSchema.safeParse({
        ...validMember,
        kidsNotes: '',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.kidsNotes).toBe('');
      }
    });

    it('fails when required fields are missing', () => {
      const result = MemberSchema.safeParse({
        ...validMember,
        firstName: '',
      });

      expect(result.success).toBe(false);
    });
  });
});
