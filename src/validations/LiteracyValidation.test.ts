import { describe, expect, it } from 'vitest';
import { LiteracyStudentSchema } from './LiteracyValidation';

describe('LiteracyStudentSchema', () => {
  it('validates a complete and correct literacy student input', () => {
    const validData = {
      studentName: 'Raimundo Nonato Silva',
      guardianName: 'Francisca Silva',
      guardianPhone: '86999998888',
      address: 'Rua Principal, 100',
      neighborhood: 'São Pedro',
      city: 'Teresina',
      age: '54',
      gender: 'M' as const,
      educationLevel: 'NUNCA_ESTUDOU' as const,
      preferredShift: 'NOITE' as const,
      hasSpecialNeeds: false,
      specialNeedsDetails: '',
      registeredBy: 'Irmão Carlos',
      status: 'INSCRITO' as const,
      assignedClass: '',
      notes: 'Disponível após as 19h',
    };

    const result = LiteracyStudentSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('rejects input when studentName is missing or too short', () => {
    const invalidData = {
      studentName: 'A',
      guardianPhone: '86999998888',
      address: 'Rua 1',
      age: '30',
      gender: 'F' as const,
      educationLevel: 'NUNCA_ESTUDOU' as const,
      preferredShift: 'MANHA' as const,
      hasSpecialNeeds: false,
    };

    const result = LiteracyStudentSchema.safeParse(invalidData);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('studentName');
    }
  });

  it('rejects input when guardianPhone is too short', () => {
    const invalidData = {
      studentName: 'Maria José',
      guardianPhone: '123',
      address: 'Rua das Flores',
      age: '45',
      gender: 'F' as const,
      educationLevel: 'ALFABETIZANDO_INICIAL' as const,
      preferredShift: 'TARDE' as const,
      hasSpecialNeeds: false,
    };

    const result = LiteracyStudentSchema.safeParse(invalidData);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('guardianPhone');
    }
  });
});
