import { describe, expect, it, vi } from 'vitest';
import { analyzeMessageWithAI } from './AIOrchestratorEngine';

vi.mock('@/libs/Env', () => ({
  Env: {
    OPENROUTER_API_KEY: '',
    OPENROUTER_MODEL: '',
  },
}));

describe('AIOrchestratorEngine', () => {
  describe('ruleBasedAnalysis / fallback flow', () => {
    it('does not extract name on pure negation "Não me chamo Gabriel"', async () => {
      const result = await analyzeMessageWithAI('Não me chamo Gabriel', 'Gabriel');

      expect(result.intent).toBe('WRONG_NUMBER');
      expect(result.detectedName).toBeUndefined();
      expect(result.isDifferentPerson).toBe(true);
    });

    it('extracts corrected name and leaves detectedOptIn as null for "Nao me chamo Gabriel, e sim Wanderson"', async () => {
      const result = await analyzeMessageWithAI('Nao me chamo Gabriel, e sim Wanderson', 'Gabriel');

      expect(result.intent).toBe('WRONG_NUMBER');
      expect(result.detectedName).toBe('Wanderson');
      expect(result.detectedOptIn).toBeNull();
      expect(result.isDifferentPerson).toBe(true);
    });

    it('extracts name for "Me chamo Wanderson"', async () => {
      const result = await analyzeMessageWithAI('Me chamo Wanderson', 'Gabriel');

      expect(result.detectedName).toBe('Wanderson');
    });

    it('extracts name for "Meu nome é Wanderson Chaves"', async () => {
      const result = await analyzeMessageWithAI('Meu nome é Wanderson Chaves', 'Gabriel');

      expect(result.detectedName).toBe('Wanderson Chaves');
    });

    it('detects opt-in for "Sim"', async () => {
      const result = await analyzeMessageWithAI('Sim', 'Wanderson');

      expect(result.intent).toBe('CONFIRMED');
      expect(result.detectedOptIn).toBe(true);
    });

    it('does not extract name for "Amém" or "Amem" and classifies as OTHER', async () => {
      const res1 = await analyzeMessageWithAI('Amém', 'Danilo');

      expect(res1.intent).toBe('OTHER');
      expect(res1.detectedName).toBeUndefined();

      const res2 = await analyzeMessageWithAI('Amem', 'Danilo');

      expect(res2.intent).toBe('OTHER');
      expect(res2.detectedName).toBeUndefined();

      const res3 = await analyzeMessageWithAI('Amém 🙏', 'Danilo');

      expect(res3.intent).toBe('OTHER');
      expect(res3.detectedName).toBeUndefined();
    });

    it('does not extract name for religious phrases like "Deus abençoe" or "Glória a Deus"', async () => {
      const res1 = await analyzeMessageWithAI('Deus abençoe', 'Danilo');

      expect(res1.detectedName).toBeUndefined();

      const res2 = await analyzeMessageWithAI('Glória a Deus', 'Danilo');

      expect(res2.detectedName).toBeUndefined();
    });

    it('detects opt-out for "Não quero receber nada"', async () => {
      const result = await analyzeMessageWithAI('Não quero receber nada', 'Wanderson');

      expect(result.detectedOptIn).toBe(false);
    });

    it('detects opt-out for "Parar"', async () => {
      const result = await analyzeMessageWithAI('Parar', 'Wanderson');

      expect(result.detectedOptIn).toBe(false);
    });

    it('classifies "Não, está errado" as OUTDATED_DATA with detectedOptIn: null', async () => {
      const result = await analyzeMessageWithAI('Não, está errado', 'Wanderson');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedOptIn).toBeNull();
      expect(result.detectedName).toBeUndefined();
    });

    it('classifies standalone "Não" as OUTDATED_DATA with detectedOptIn: null rather than opt-out', async () => {
      const result = await analyzeMessageWithAI('Não', 'Wanderson');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedOptIn).toBeNull();
      expect(result.detectedName).toBeUndefined();
    });

    it('classifies "Não confirmo" as OUTDATED_DATA with detectedOptIn: null', async () => {
      const result = await analyzeMessageWithAI('Não confirmo', 'Wanderson');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedOptIn).toBeNull();
    });

    it('extracts name for "Não, meu nome é Carlos" with detectedOptIn: null', async () => {
      const result = await analyzeMessageWithAI('Não, meu nome é Carlos', 'Wanderson');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedName).toBe('Carlos');
      expect(result.detectedOptIn).toBeNull();
    });

    it('does not extract name on negated name with leading words "Mas nao me chamo Wanderson"', async () => {
      const result = await analyzeMessageWithAI('Mas nao me chamo Wanderson', 'Wanderson');

      expect(result.intent).toBe('WRONG_NUMBER');
      expect(result.detectedName).toBeUndefined();
      expect(result.isDifferentPerson).toBe(true);
    });

    it('classifies "mas meu nome não e esse" (mixed diacritics) as OUTDATED_DATA without hallucinating name', async () => {
      const result = await analyzeMessageWithAI('mas meu nome não e esse', 'Wendersonnn');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedName).toBeUndefined();
      expect(result.detectedOptIn).toBeNull();
    });

    it('classifies "meu nome não é esse" and "esse nao e meu nome" as OUTDATED_DATA', async () => {
      const res1 = await analyzeMessageWithAI('meu nome não é esse', 'Wendersonnn');

      expect(res1.intent).toBe('OUTDATED_DATA');
      expect(res1.detectedName).toBeUndefined();

      const res2 = await analyzeMessageWithAI('esse nao e meu nome', 'Wendersonnn');

      expect(res2.intent).toBe('OUTDATED_DATA');
      expect(res2.detectedName).toBeUndefined();
    });

    it('extracts street address for "Rua Ferroviaria, 8400"', async () => {
      const result = await analyzeMessageWithAI('Rua Ferroviaria, 8400', 'Wanderson');

      expect(result.detectedAddress).toBe('Rua Ferroviaria, 8400');
    });

    it('extracts generation slot for "Geração 3" and "G12", ignores out of bounds', async () => {
      const res1 = await analyzeMessageWithAI('Sou da Geração 3', 'Wanderson');

      expect(res1.detectedGeneration).toBe(3);

      const res2 = await analyzeMessageWithAI('Faço parte da G12', 'Wanderson');

      expect(res2.detectedGeneration).toBe(12);

      const res3 = await analyzeMessageWithAI('Geração 15', 'Wanderson');

      expect(res3.detectedGeneration).toBeUndefined();
    });

    it('extracts ministry actions for adding and removing ministries', async () => {
      const resAdd = await analyzeMessageWithAI('Participo do Louvor e Mídia', 'Wanderson');

      expect(resAdd.detectedMinistries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Louvor & Adoração', action: 'ADD' }),
          expect.objectContaining({ name: 'Mídia & Produção', action: 'ADD' }),
        ]),
      );

      const resRemove = await analyzeMessageWithAI('Não participo mais da Intercessão', 'Wanderson');

      expect(resRemove.detectedMinistries).toEqual([
        { name: 'Intercessão', action: 'REMOVE' },
      ]);
    });

    it('extracts name, email, and address from multi-line message', async () => {
      const multiLineText = [
        'Wanderson Chaves',
        'wandersonchavesbr14@gmail.com',
        'Rua Ferroviaria, 8400',
      ].join('\n');

      const result = await analyzeMessageWithAI(multiLineText, 'Wendersonnn Chaves');

      expect(result.intent).toBe('OUTDATED_DATA');
      expect(result.detectedName).toBe('Wanderson Chaves');
      expect(result.detectedEmail).toBe('wandersonchavesbr14@gmail.com');
      expect(result.detectedAddress).toBe('Rua Ferroviaria, 8400');
    });

    it('extracts name for "nome: Wanderson Chaves" and "nome Wanderson Chaves"', async () => {
      const res1 = await analyzeMessageWithAI('nome: Wanderson Chaves', 'Wendersonnn Chaves');

      expect(res1.detectedName).toBe('Wanderson Chaves');
      expect(res1.intent).toBe('OUTDATED_DATA');

      const res2 = await analyzeMessageWithAI('nome Wanderson Chaves', 'Wendersonnn Chaves');

      expect(res2.detectedName).toBe('Wanderson Chaves');
      expect(res2.intent).toBe('OUTDATED_DATA');

      const res3 = await analyzeMessageWithAI('esse é meu nome: Wanderson Chaves', 'Wendersonnn Chaves');

      expect(res3.detectedName).toBe('Wanderson Chaves');
    });

    it('extracts name with suffix "Wanderson Chaves, esse é meu nome" and "Wanderson Chaves é meu nome"', async () => {
      const res1 = await analyzeMessageWithAI('Wanderson Chaves, esse é meu nome', 'Wendersonnn Chaves');

      expect(res1.detectedName).toBe('Wanderson Chaves');

      const res2 = await analyzeMessageWithAI('Wanderson Chaves é meu nome', 'Wendersonnn Chaves');

      expect(res2.detectedName).toBe('Wanderson Chaves');
    });

    it('recovers name from context when message is follow-up "esse é meu nome"', async () => {
      const context = 'nome: Wanderson Chaves';
      const result = await analyzeMessageWithAI('esse é meu nome', 'Wendersonnn Chaves', context);

      expect(result.detectedName).toBe('Wanderson Chaves');
      expect(result.intent).toBe('OUTDATED_DATA');
    });
  });

  describe('AI post-processing safety guards', () => {
    it('discards hallucinated member name when message is pure negation', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                intent: 'WRONG_NUMBER',
                detectedName: 'Gabriel',
                detectedOptIn: null,
                isDifferentPerson: true,
              }),
            },
          }],
        })),
      }));

      const { Env } = await import('@/libs/Env');
      Env.OPENROUTER_API_KEY = 'test-key';

      const result = await analyzeMessageWithAI('Não me chamo Gabriel', 'Gabriel');

      expect(result.detectedName).toBeUndefined();
    });

    it('clears false positive detectedOptIn when text is "e sim [Nome]"', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                intent: 'WRONG_NUMBER',
                detectedName: 'Wanderson',
                detectedOptIn: true,
                isDifferentPerson: true,
              }),
            },
          }],
        })),
      }));

      const { Env } = await import('@/libs/Env');
      Env.OPENROUTER_API_KEY = 'test-key';

      const result = await analyzeMessageWithAI('Nao me chamo Gabriel, e sim Wanderson', 'Gabriel');

      expect(result.detectedOptIn).toBeNull();
      expect(result.detectedName).toBe('Wanderson');
    });

    it('recovers corrected name via rule extraction if AI returned null detectedName', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                intent: 'WRONG_NUMBER',
                detectedName: null,
                detectedOptIn: null,
                isDifferentPerson: true,
              }),
            },
          }],
        })),
      }));

      const { Env } = await import('@/libs/Env');
      Env.OPENROUTER_API_KEY = 'test-key';

      const result = await analyzeMessageWithAI('Nao me chamo Gabriel, e sim Wanderson', 'Gabriel');

      expect(result.detectedName).toBe('Wanderson');
    });

    it('discards hallucinated detectedName if AI returns Amém or religious phrase', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                intent: 'OUTDATED_DATA',
                detectedName: 'Amém',
                detectedOptIn: null,
                isDifferentPerson: false,
              }),
            },
          }],
        })),
      }));

      const { Env } = await import('@/libs/Env');
      Env.OPENROUTER_API_KEY = 'test-key';

      const result = await analyzeMessageWithAI('Amém', 'Danilo');

      expect(result.detectedName).toBeUndefined();
    });
  });
});
