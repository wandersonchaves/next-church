import { describe, expect, it } from 'vitest';
import { buildG12Tree } from './TreeUtils';

describe('TreeUtils - buildG12Tree', () => {
  it('deve montar uma árvore correta a partir de uma lista plana', () => {
    const flatList = [
      { id: '1', first_name: 'Líder', last_name: 'Raiz', leader_id: null, current_step: 'SENDING', level: 1 },
      { id: '2', first_name: 'Discípulo', last_name: '1', leader_id: '1', current_step: 'ENCOUNTER', level: 2 },
      { id: '3', first_name: 'Discípulo', last_name: '2', leader_id: '1', current_step: 'DECISION', level: 2 },
      { id: '4', first_name: 'Neto', last_name: '1', leader_id: '2', current_step: 'DECISION', level: 3 },
    ];

    const tree = buildG12Tree(flatList);

    expect(tree).toHaveLength(1); // Apenas 1 raiz
    expect(tree[0]?.children).toHaveLength(2); // Líder tem 2 discípulos
    expect(tree[0]?.children[0]?.children).toHaveLength(1); // Discípulo 1 tem 1 neto
    expect(tree[0]?.children[0]?.children[0]?.id).toBe('4');
  });

  it('deve lidar com múltiplas raízes (redes paralelas)', () => {
    const flatList = [
      { id: '1', first_name: 'Líder', last_name: 'A', leader_id: null, current_step: 'SENDING', level: 1 },
      { id: '2', first_name: 'Líder', last_name: 'B', leader_id: null, current_step: 'SENDING', level: 1 },
    ];

    const tree = buildG12Tree(flatList);

    expect(tree).toHaveLength(2);
  });

  it('deve retornar lista vazia se a entrada for vazia', () => {
    expect(buildG12Tree([])).toEqual([]);
  });
});
