import { db } from '@/libs/DB';
import { ministries } from '@/models/Schema';
import { eq } from 'drizzle-orm';

/**
 * Módulo de Inicialização (Seed) para novas Organizações.
 * Cria os ministérios básicos e configura o ambiente.
 */
export const SeedService = {
  /**
   * Inicializa uma organização com dados padrão se ela estiver vazia.
   */
  async initializeOrganization(orgId: string) {
    // 1. Verifica se já existem ministérios
    const existing = await db
      .select()
      .from(ministries)
      .where(eq(ministries.organizationId, orgId))
      .limit(1);

    if (existing.length > 0) return;

    // 2. Ministérios Padrão
    const defaultMinistries = [
      { name: 'Louvor & Adoração', description: 'Equipe responsável pela música e ambiente de adoração.' },
      { name: 'Mídia & Produção', description: 'Som, projeção, redes sociais e transmissão.' },
      { name: 'TelePaz Filadélfia Kids', description: 'Ensino bíblico e cuidado para a próxima geração.' },
      { name: 'Consolidação', description: 'Acolhimento e acompanhamento de novos decididos.' },
      { name: 'Intercessão', description: 'Cobertura espiritual e reuniões de oração.' },
      { name: 'Apoio & Logística', description: 'Organização, limpeza e recepção.' },
    ];

    try {
      await db.insert(ministries).values(
        defaultMinistries.map(m => ({
          organizationId: orgId,
          name: m.name,
          description: m.description,
        }))
      );
      console.log(`[SEED] Org ${orgId} inicializada com ministérios padrão.`);
    } catch (e) {
      console.error(`[SEED_ERROR] Erro ao inicializar org ${orgId}:`, e);
    }
  }
};
