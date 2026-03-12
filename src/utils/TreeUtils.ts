import type { G12Node } from '@/libs/services/MemberService';

/**
 * Transforma a lista plana do SQL em árvore JSON.
 * Sincronizado com os aliases camelCase da query.
 * @param flatList - A lista de membros retornada pela consulta SQL recursiva.
 */
export function buildG12Tree(flatList: any[]): G12Node[] {
  const map = new Map<string, G12Node>();
  const tree: G12Node[] = [];

  flatList.forEach((item) => {
    // Usamos os nomes exatos definidos nos aliases da query SQL
    map.set(item.id, {
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      leaderId: item.leaderId,
      currentStep: item.currentStep,
      level: item.level,
      generationSlot: item.generationSlot,
      children: [],
    });
  });

  flatList.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.leaderId && map.has(item.leaderId)) {
      map.get(item.leaderId)!.children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
}
