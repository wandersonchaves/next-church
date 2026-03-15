import type { G12Node } from '@/libs/services/MemberService';

/**
 * Transforma uma lista plana em estrutura de árvore.
 * Suporta membros órfãos (ex: quando o pai é filtrado).
 * @param flatList
 */
export function buildG12Tree(flatList: any[]): G12Node[] {
  const map = new Map<string, G12Node>();
  const roots: G12Node[] = [];

  // Primeiro passo: Criar os nós
  flatList.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  // Segundo passo: Ligar pais e filhos
  flatList.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.leaderId && map.has(item.leaderId)) {
      map.get(item.leaderId)!.children.push(node);
    } else {
      // Se não tem líder na lista (é raiz ou órfão), adiciona ao topo
      roots.push(node);
    }
  });

  return roots;
}
