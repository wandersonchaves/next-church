import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemberDomain } from './MemberDomain';

describe('MemberDomain - getKidsClass', () => {
  beforeAll(() => {
    // Congela a data atual em 2026-03-10 para testes precisos
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('deve retornar BERCARIO para idade <= 2 anos', () => {
    const birth = new Date('2024-03-10');

    expect(MemberDomain.getKidsClass(birth)).toBe('BERCARIO');
  });

  it('deve retornar MATERNAL para idade de 3 a 5 anos', () => {
    const birth = new Date('2021-03-10');

    expect(MemberDomain.getKidsClass(birth)).toBe('MATERNAL');
  });

  it('deve retornar JUNIORES para idade de 10 a 14 anos', () => {
    const birth = new Date('2014-03-10');

    expect(MemberDomain.getKidsClass(birth)).toBe('JUNIORES');
  });

  it('deve retornar null para idade > 14 anos', () => {
    const birth = new Date('2010-03-10');

    expect(MemberDomain.getKidsClass(birth)).toBeNull();
  });
});

describe('MemberDomain - canTransitionTo', () => {
  it('deve permitir avançar um passo na jornada', () => {
    expect(MemberDomain.canTransitionTo('DECISION', 'CONSOLIDATION')).toBe(true);
    expect(MemberDomain.canTransitionTo('ENCOUNTER', 'POST_ENCOUNTER')).toBe(true);
  });

  it('deve impedir pular passos', () => {
    expect(MemberDomain.canTransitionTo('DECISION', 'ENCOUNTER')).toBe(false);
  });

  it('deve permitir resetar para DECISION em qualquer passo', () => {
    expect(MemberDomain.canTransitionTo('SENDING', 'DECISION')).toBe(true);
  });
});
