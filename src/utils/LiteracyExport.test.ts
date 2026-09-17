import { describe, expect, it } from 'vitest';
import {
  escapeCsvCell,
  formatBrazilianDate,
  formatBrazilianDateTime,
  formatBrazilianTime,
  generateLiteracyCsv,
  getDailyRegistrationStats,
  LITERACY_EXPORT_HEADERS,
  type LiteracyExportStudent,
} from './LiteracyExport';

describe('LiteracyExport', () => {
  describe('escapeCsvCell', () => {
    it('escapes strings containing semicolon with quotes', () => {
      expect(escapeCsvCell('Rua 10; Bairro Centro')).toBe('"Rua 10; Bairro Centro"');
    });

    it('escapes double quotes by doubling them', () => {
      expect(escapeCsvCell('Aluno "Especial"')).toBe('"Aluno ""Especial"""');
    });

    it('handles null and undefined by returning empty string', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('returns simple string without extra quotes', () => {
      expect(escapeCsvCell('Maria da Silva')).toBe('Maria da Silva');
    });
  });

  describe('formatBrazilianDate', () => {
    it('formats valid Date to DD/MM/AAAA format', () => {
      const date = new Date(1995, 4, 18); // May 18, 1995

      expect(formatBrazilianDate(date)).toBe('18/05/1995');
    });

    it('returns hyphen for null or invalid date', () => {
      expect(formatBrazilianDate(null)).toBe('-');
      expect(formatBrazilianDate('invalid-date')).toBe('-');
    });
  });

  describe('formatBrazilianDateTime', () => {
    it('formats date and time accurately', () => {
      const date = new Date(2026, 2, 10, 14, 30);

      expect(formatBrazilianDateTime(date)).toBe('10/03/2026 14:30');
    });

    it('returns hyphen for null or invalid date', () => {
      expect(formatBrazilianDateTime(null)).toBe('-');
      expect(formatBrazilianDateTime('invalid-date')).toBe('-');
    });
  });

  describe('formatBrazilianTime', () => {
    it('formats time accurately in HH:mm format', () => {
      const date = new Date(2026, 2, 10, 9, 5);

      expect(formatBrazilianTime(date)).toBe('09:05');
    });

    it('returns hyphen for null or invalid date', () => {
      expect(formatBrazilianTime(null)).toBe('-');
      expect(formatBrazilianTime('invalid-date')).toBe('-');
    });
  });

  describe('getDailyRegistrationStats', () => {
    it('groups registrations by date and counts accurately', () => {
      const mockStudents = [
        { createdAt: new Date(2026, 2, 17, 10, 0) },
        { createdAt: new Date(2026, 2, 17, 15, 30) },
        { createdAt: new Date(2026, 2, 16, 9, 0) },
        { createdAt: '2026-03-16T14:20:00.000Z' },
        { createdAt: new Date(2026, 2, 15, 11, 45) },
      ];

      const stats = getDailyRegistrationStats(mockStudents);

      expect(stats.length).toBe(3);
      expect(stats[0]?.date).toBe('17/03/2026');
      expect(stats[0]?.count).toBe(2);
      expect(stats[2]?.date).toBe('15/03/2026');
      expect(stats[2]?.count).toBe(1);
    });

    it('handles empty or invalid list gracefully', () => {
      expect(getDailyRegistrationStats([])).toEqual([]);
      expect(getDailyRegistrationStats([{ createdAt: null }, { createdAt: 'invalid' }])).toEqual([]);
    });
  });

  describe('generateLiteracyCsv', () => {
    it('generates CSV with UTF-8 BOM and correct headers', () => {
      const sampleStudents: LiteracyExportStudent[] = [
        {
          id: '1',
          studentName: 'João da Conceição',
          guardianName: 'Maria Silva',
          guardianPhone: '(86) 99999-8888',
          address: 'Rua Principal, 123',
          neighborhood: 'Mocambinho',
          city: 'Teresina',
          age: 45,
          birthDate: new Date(1981, 1, 10),
          gender: 'M',
          educationLevel: 'NUNCA_ESTUDOU',
          preferredShift: 'NOITE',
          hasSpecialNeeds: false,
          specialNeedsDetails: null,
          registeredBy: 'Pr. Carlos',
          status: 'INSCRITO',
          assignedClass: null,
          notes: 'Deseja muito aprender a ler a Bíblia',
          createdAt: new Date(2026, 2, 1, 10, 0),
        },
      ];

      const csv = generateLiteracyCsv(sampleStudents);

      // Begins with UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Contains semicolon headers
      expect(csv).toContain(LITERACY_EXPORT_HEADERS.join(';'));

      // Contains mapped student labels
      expect(csv).toContain('João da Conceição');
      expect(csv).toContain('Masculino');
      expect(csv).toContain('Não alfabetizado (Nunca estudou)');
      expect(csv).toContain('Inscrito (Aguardando Turma)');
      expect(csv).toContain('Deseja muito aprender a ler a Bíblia');
    });

    it('handles empty list returning headers only with BOM', () => {
      const csv = generateLiteracyCsv([]);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toBe(`\uFEFF${LITERACY_EXPORT_HEADERS.join(';')}`);
    });
  });
});
