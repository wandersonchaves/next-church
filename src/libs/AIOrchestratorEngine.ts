import { Env } from '@/libs/Env';

export type MinistryAction = {
  name: string;
  action: 'ADD' | 'REMOVE';
};

export type AIExtractionResult = {
  intent: 'WRONG_NUMBER' | 'OUTDATED_DATA' | 'CONFIRMED' | 'OTHER';
  detectedName?: string;
  detectedEmail?: string;
  detectedAddress?: string;
  detectedGeneration?: number;
  detectedAttemptedOutOfRangeGeneration?: number;
  detectedMinistries?: MinistryAction[];
  detectedOptIn?: boolean | null;
  isDifferentPerson: boolean;
  rawDetails?: string;
};

export const NON_NAME_PHRASES = [
  'amem',
  'amém',
  'amen',
  'aleluia',
  'aleluias',
  'gloria a deus',
  'glória a deus',
  'glorias a deus',
  'glórias a deus',
  'gloria a jesus',
  'glória a jesus',
  'gracas a deus',
  'graças a deus',
  'deus abencoe',
  'deus abençoe',
  'deus te abencoe',
  'deus te abençoe',
  'deus vos abencoe',
  'deus vos abençoe',
  'deus seja louvado',
  'louvado seja deus',
  'louvado seja o senhor',
  'paz do senhor',
  'a paz do senhor',
  'paz de cristo',
  'a paz de cristo',
  'graca e paz',
  'graça e paz',
  'a paz',
  'paz de deus',
  'bom dia',
  'boa tarde',
  'boa noite',
  'obrigado',
  'obrigada',
  'muito obrigado',
  'muito obrigada',
  'valeu',
  'gratidao',
  'gratidão',
  'recebo',
  'eu recebo',
  'amem eu recebo',
  'amém eu recebo',
  'tomo posse',
  'eu creio',
  'pastor',
  'pastora',
  'irmao',
  'irmão',
  'irma',
  'irmã',
  'igreja',
  'culto',
  'celula',
  'célula',
];

export const NON_NAME_WORDS = new Set([
  'amem',
  'amém',
  'amen',
  'aleluia',
  'aleluias',
  'gloria',
  'glória',
  'glorias',
  'glórias',
  'deus',
  'jesus',
  'cristo',
  'senhor',
  'pai',
  'espirito',
  'espírito',
  'santo',
  'paz',
  'graca',
  'graça',
  'bencao',
  'bênção',
  'bencaos',
  'bênçãos',
  'abencoe',
  'abençoe',
  'abençoei',
  'abençoa',
  'abencoa',
  'oracao',
  'oração',
  'oracoes',
  'orações',
  'reza',
  'prece',
  'culto',
  'igreja',
  'celula',
  'célula',
  'rede',
  'ministerio',
  'ministério',
  'geracao',
  'geração',
  'frente',
  'frentes',
  'g12',
  'telepaz',
  'filadelfia',
  'filadélfia',
  'pastor',
  'pastora',
  'bispo',
  'bispa',
  'apostolo',
  'apóstolo',
  'diacono',
  'diácono',
  'presbitero',
  'presbítero',
  'obreiro',
  'obreira',
  'lider',
  'líder',
  'irmao',
  'irmão',
  'irma',
  'irmã',
  'recebo',
  'posse',
  'tomo',
  'creio',
  'concordo',
  'verdade',
  'ola',
  'olá',
  'oi',
  'oie',
  'opa',
  'eai',
  'obrigado',
  'obrigada',
  'valeu',
  'gratidao',
  'gratidão',
  'agradecido',
  'agradecida',
  'sim',
  'nao',
  'não',
  'ok',
  'blz',
  'beleza',
  'show',
  'top',
  'massa',
  'legal',
  'maravilha',
  'perfeito',
  'otimo',
  'ótimo',
  'excelente',
  'com certeza',
  'claro',
  'visitante',
  'contato',
  'membro',
  'novo',
  'midia',
  'mídia',
  'esse',
  'essa',
  'este',
  'esta',
  'errado',
  'errada',
  'certo',
  'certa',
  'meu',
  'nome',
  'cadastro',
  'pessoa',
]);

/**
 * Normalizes text by removing diacritical marks (accents and tildes) and lowercasing.
 * Ensures consistent matching in Brazilian Portuguese regardless of accentuation.
 * @param text - Input text to normalize.
 * @returns Lowercase string stripped of diacritics.
 */
export function removeDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Checks if a string is a non-name term (such as religious phrases, greetings, or acknowledgments).
 * @param name - Candidate name to evaluate.
 */
export function isInvalidName(name?: string | null): boolean {
  if (!name) {
    return true;
  }
  const clean = name.toLowerCase().replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
  if (clean.length < 2) {
    return true;
  }

  if (NON_NAME_PHRASES.some(p => clean === p || clean.startsWith(`${p} `) || clean.endsWith(` ${p}`))) {
    return true;
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1 && NON_NAME_WORDS.has(words[0]!)) {
    return true;
  }
  if (words.every(w => NON_NAME_WORDS.has(w))) {
    return true;
  }

  return false;
}

function sanitizeName(name?: string | null): string | undefined {
  if (!name) {
    return undefined;
  }
  const clean = name
    .replace(/\[.*?\]/g, '') // Removes [mídia], [De: ...], etc.
    .replace(/[^\p{L}\s]/gu, '') // Keeps letters and spaces
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length >= 2 ? clean : undefined;
}
/**
 * Executes a text classification and extraction request using OpenRouter.
 * Supports fallback models if the primary model fails.
 * @param messageContent - Text content of the received message.
 * @param memberName - Expected registered member full name.
 * @param fullContext - Optional accumulated recent conversation context.
 */
export async function analyzeMessageWithAI(
  messageContent: string,
  memberName: string,
  fullContext?: string,
): Promise<AIExtractionResult> {
  const apiKey = Env.OPENROUTER_API_KEY;

  // Fallback baseado em regras se a chave da API não estiver presente ou vazia
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[AI_ORCHESTRATOR] OpenRouter API key is not configured. Falling back to rule-based analysis.');
    return ruleBasedAnalysis(messageContent, fullContext);
  }

  const primaryModel = Env.OPENROUTER_MODEL || 'openrouter/auto';
  const models = Array.from(new Set([
    'openrouter/auto',
    primaryModel,
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'google/gemini-flash-1.5:free',
  ]));

  const systemPrompt = `Você é o assistente de IA da Next Church, responsável por analisar mensagens recebidas via WhatsApp e classificar a intenção do remetente em relação ao cadastro do membro procurado ("${memberName}").
  
Instruções de Classificação:
1. "WRONG_NUMBER": O interlocutor avisa na ÚLTIMA mensagem que o número não pertence ao membro procurado ("não sou ele", "não me chamo [Nome]", "número errado", "esse número não é do ${memberName}", "não conheço").
2. "OUTDATED_DATA": O interlocutor corrige seu próprio nome, avisa que o nome cadastrado está incorreto ou desatualizado, contesta os dados informados (ex: "está errado", "não está certo", "não confirmo", ou "não" ao conferir os dados apresentados), ou informa que alguma informação cadastral mudou/está incorreta (ex: "me chamo Wanderson", "meu nome é Wanderson", "não sou Gabriel, sou o Wanderson", "meu nome está errado, sou Wanderson", "meu e-mail mudou para...", "mudei de endereço", "meu e-mail é natalia@gmail.com", "sou da geração 3", "participo do louvor").
3. "CONFIRMED": O interlocutor confirma que é a pessoa procurada ("sou eu", "sim, sou eu") ou responde "sim" / "pode mandar" / "aceito" para continuar recebendo mensagens da igreja.
4. "OTHER": Outros casos (saudações genéricas como "olá", dúvidas gerais sobre culto/endereço sem alteração de cadastro, ou mensagens sem dados cadastrais).

Extração de Entidades e Consentimento:
- "detectedName": Nome próprio informado da pessoa (ex: "me chamo Wanderson" -> "Wanderson", "meu nome é Wanderson Chaves" -> "Wanderson Chaves", "sou o Carlos" -> "Carlos", "não me chamo Beatriz, sou o Carlos" -> "Carlos", "não me chamo Gabriel, e sim Wanderson" -> "Wanderson"). ATENÇÃO CRÍTICA: Expressões religiosas, saudações, louvores e agradecimentos (como "Amém", "Amem", "Aleluia", "Glória a Deus", "Graças a Deus", "Deus abençoe", "Obrigado", "Paz do Senhor", "Recebo", "Tomo posse") NUNCA são nomes! Nesses casos "detectedName" DEVE ser null e a intenção é "OTHER". Se a pessoa apenas disser que NÃO é alguém (ex: "Não sou a Beatriz", "Não me chamo Gabriel", "Não é a Natália", "Mas não me chamo Wanderson"), o "detectedName" DEVE ser null, pois o nome da nova pessoa NÃO foi informado ainda. NUNCA coloque o nome que foi rejeitado em detectedName.
- "detectedEmail": E-mail informado na mensagem (ex: "natalia@gmail.com").
- "detectedAddress": Endereço informado na mensagem (ex: "Rua Ferroviaria, 8400", "Av. Paulista, 1000").
- "detectedGeneration": Número da geração ou frente no modelo G12 (inteiro estritamente de 1 a 12, ex: "Geração 3" -> 3, "G2" -> 2, "g12" -> 12, "F3" -> 3, "F12" -> 12, "Geração F3" -> 3, "Frente 4" -> 4). Se não informado ou fora de 1 a 12 (ex: F13), retorne null.
- "detectedMinistries": Lista de ministérios mencionados na mensagem (ex: "sou do louvor" -> [{"name": "Louvor & Adoração", "action": "ADD"}], "saí da mídia" -> [{"name": "Mídia & Produção", "action": "REMOVE"}]). Se não informado, null.
- "detectedOptIn": true se a pessoa aceitar/autorizar receber mensagens da igreja (ex: "sim", "pode mandar", "aceito", "quero"), false se a pessoa declarar explicitamente que NÃO quer receber mensagens da igreja (ex: "parar", "não quero receber", "não envie mais", "remova meu número", "cancele mensagens", "sair"), ou null se não for recusa de mensagens (ex: se disser "não" para os dados, se disser "está errado", ou se corrigir o nome como "não, sou Wanderson"). IMPORTANTE: Rejeição ou contestação de dados cadastrais (como "está errado", "não é esse", "não confirmo", "não, meu nome é X") NUNCA é opt-out de mensagens (detectedOptIn deve ser null nesses casos).
- "isDifferentPerson": true se a intenção for WRONG_NUMBER ou se a pessoa informar explicitamente que o número pertence a outra pessoa diferente de "${memberName}", caso contrário false.
- "rawDetails": Detalhes extras ou resumo da mensagem.

Retorne APENAS um objeto JSON plano exatamente com a estrutura abaixo, sem formatação markdown (sem \`\`\`json) e sem explicações:
{
  "intent": "WRONG_NUMBER" | "OUTDATED_DATA" | "CONFIRMED" | "OTHER",
  "detectedName": string | null,
  "detectedEmail": string | null,
  "detectedAddress": string | null,
  "detectedGeneration": number | null,
  "detectedMinistries": Array<{ "name": string, "action": "ADD" | "REMOVE" }> | null,
  "detectedOptIn": boolean | null,
  "isDifferentPerson": boolean,
  "rawDetails": string | null
}`;

  const promptMessage = fullContext
    ? `Histórico recente de contexto:\n"${fullContext}"\n\nÚltima mensagem recebida:\n"${messageContent}"`
    : `Mensagem recebida: "${messageContent}"`;

  for (const model of models) {
    try {
      console.warn(`[AI_ORCHESTRATOR] Attempting classification with model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/wandersonchaves/next-church',
          'X-Title': 'Next Church CMS',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptMessage },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout for LLM generation
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      const payload = JSON.parse(responseText);
      const contentText = payload.choices?.[0]?.message?.content;

      if (!contentText) {
        throw new Error('Empty message content received from OpenRouter');
      }

      console.warn(`[AI_ORCHESTRATOR] Response from ${model}: ${contentText}`);

      // Sanitiza possíveis markdown wrappers
      const cleanJsonStr = contentText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJsonStr) as AIExtractionResult;

      // Validação básica do resultado
      if (result && typeof result.intent === 'string') {
        let cleanDetectedName = sanitizeName(result.detectedName);
        let optIn = typeof result.detectedOptIn === 'boolean' ? result.detectedOptIn : null;

        // Guarda 1: Se a mensagem contém "e sim [Nome]" sem outra confirmação explícita, detectedOptIn não pode ser true
        if (optIn === true) {
          const withoutCorrection = messageContent.toLowerCase().replace(/(?:e|mas)\s+sim\s+\p{L}+/giu, '');
          const hasOtherConfirmation = /\b(?:gostaria|aceito|pode mandar|pode enviar|quero|autorizo|confirmo)\b/iu.test(withoutCorrection) || /\bsim\b/iu.test(withoutCorrection);
          if (!hasOtherConfirmation) {
            optIn = null;
          }
        }

        // Guarda 2: Se detectedName for o mesmo nome já cadastrado ou apenas o primeiro nome sem alterações
        if (cleanDetectedName) {
          const cleanDetectedNorm = removeDiacritics(cleanDetectedName);
          const memberNorm = removeDiacritics(memberName.trim());
          const memberFirst = memberNorm.split(' ')[0];
          if (cleanDetectedNorm === memberNorm || (memberFirst && cleanDetectedNorm === memberFirst)) {
            cleanDetectedName = undefined;
          }

          // Se a mensagem contiver negação desse nome (ex: "Mas não me chamo Wanderson", "Não sou o Wanderson")
          if (cleanDetectedName) {
            const negatedNamePattern = new RegExp(
              `(?:não|nao)\\s+(?:me chamo|sou|é|e|conheço|conheco|seria)\\s+(?:o\\s+|a\\s+)?${cleanDetectedNorm}\\b`,
              'iu',
            );
            if (negatedNamePattern.test(removeDiacritics(messageContent))) {
              cleanDetectedName = undefined;
            }
          }
        }

        // Guarda 3: Se detectedName for uma palavra inválida (expressão religiosa, saudação, agradecimento)
        if (cleanDetectedName && isInvalidName(cleanDetectedName)) {
          cleanDetectedName = undefined;
        }

        // Guarda 4: Se o modelo LLM não conseguiu extrair o nome corrigido em frase com apresentação/correção explícita
        if (!cleanDetectedName) {
          const ruleExtracted = extractNameFromText(messageContent);
          if (ruleExtracted && !isInvalidName(ruleExtracted)) {
            const ruleNorm = removeDiacritics(ruleExtracted);
            const memberNorm = removeDiacritics(memberName.trim());
            const memberFirst = memberNorm.split(' ')[0];
            if (ruleNorm !== memberNorm && ruleNorm !== memberFirst) {
              cleanDetectedName = ruleExtracted;
            }
          }
        }

        // Extrações complementares seguras (endereço, geração, ministérios)
        let detectedAddress = result.detectedAddress || undefined;
        if (!detectedAddress) {
          detectedAddress = extractAddressFromText(messageContent);
        }

        const detectedGeneration = (typeof result.detectedGeneration === 'number' && result.detectedGeneration >= 1 && result.detectedGeneration <= 12)
          ? result.detectedGeneration
          : extractGenerationFromText(messageContent);

        const detectedAttemptedOutOfRangeGeneration = !detectedGeneration
          ? (typeof result.detectedGeneration === 'number' && (result.detectedGeneration < 1 || result.detectedGeneration > 12)
              ? result.detectedGeneration
              : extractAttemptedOutOfRangeGeneration(messageContent))
          : undefined;

        let detectedMinistries: MinistryAction[] | undefined = (Array.isArray(result.detectedMinistries) && result.detectedMinistries.length > 0)
          ? result.detectedMinistries
          : extractMinistryActionsFromText(messageContent);
        if (detectedMinistries && detectedMinistries.length === 0) {
          detectedMinistries = undefined;
        }

        return {
          intent: result.intent,
          detectedName: cleanDetectedName,
          detectedEmail: result.detectedEmail || undefined,
          detectedAddress,
          detectedGeneration,
          detectedAttemptedOutOfRangeGeneration,
          detectedMinistries,
          detectedOptIn: optIn,
          isDifferentPerson: Boolean(result.isDifferentPerson),
          rawDetails: result.rawDetails || undefined,
        };
      }
    } catch (error) {
      console.warn(`[AI_ORCHESTRATOR_ERROR] Model ${model} failed:`, error);
    }
  }

  console.warn('[AI_ORCHESTRATOR] All AI models failed. Using rule-based fallback.');
  return ruleBasedAnalysis(messageContent, fullContext);
}

/**
 * Helper to extract person name from a single line of text without capturing stop words.
 * @param line - Single-line text.
 * @param options - Extraction options.
 * @param options.allowBareName - Whether bare text without presentation prefix can be considered a name.
 */
function extractNameFromSingleLine(line: string, options?: { allowBareName?: boolean }): string | undefined {
  let clean = line.replace(/\[.*?\]/g, '').trim();
  const lower = clean.toLowerCase();

  // Ignora linhas que são declarações de geração ou ministérios sem prefixo de nome
  if (
    (
      extractGenerationFromText(line) !== undefined
      || extractAttemptedOutOfRangeGeneration(line) !== undefined
      || extractMinistryActionsFromText(line).length > 0
    )
    && !line.match(/(?:^|\b)(?:nome|chamo)\b/iu)
  ) {
    return undefined;
  }

  // Pattern 1: "não me chamo X e sim Y" / "não sou X, sou Y" / "não me chamo X, me chamo Y"
  const correctedMatch = lower.match(/(?:não|nao)\s+(?:me chamo|sou|é|e)\s+(\p{L}+(?:\s+\p{L}+)*)[,.]?\s+(?:e\s+sim|mas\s+sim|sou\s+o|sou\s+a|sou|é\s+o|é\s+a|é|e|mas|aqui\s+é|aqui\s+e|me\s+chamo|chamo-me|meu\s+nome\s+é|meu\s+nome\s+e)\s+(\p{L}+(?:\s+\p{L}+)*)/iu);
  if (correctedMatch?.[2]) {
    clean = correctedMatch[2];
  } else {
    // Pure negation check: if message contains negation like "não me chamo X" / "não sou X" without positive correction
    const hasNegation = /(?:^|\b)(?:mas\s+|e\s+|eu\s+|olá\s+|ola\s+|opa\s+|oi\s+)?(?:não|nao)\s+(?:me chamo|sou|é|e|seria)\s+(?:o\s+|a\s+)?\p{L}+/iu.test(lower);
    const hasPositiveCorrection = /e\s+sim|mas\s+sim|sou\s+o|sou\s+a|me\s+chamo|chamo-me|meu\s+nome/iu.test(lower.replace(/(?:não|nao)\s+(?:me chamo|sou|é|e)/giu, ''));
    if (hasNegation && !hasPositiveCorrection) {
      return undefined;
    }

    // Pattern 2: Explicit name prefixes (e.g. "nome: Wanderson", "meu nome: Wanderson", "meu nome é Wanderson", "nome completo Wanderson", "nome Wanderson")
    const presentationMatch = clean.match(
      /(?:^|\W)(?:(?:meu\s+)?nome(?:\s+completo)?\s*:|(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome\s*:)\s*(?:(?:somente|apenas)\s+)?(\p{L}+(?:\s+\p{L}+)*)/iu,
    ) || clean.match(
      /(?:^|\W)(?:meu nome completo [ée]|nome completo [ée]|nome completo|meu nome correto [ée]|nome correto [ée]|meu nome certo [ée]|nome certo [ée]|meu nome (?:está|tá) errado(?:,\s*sou)?|meu nome [ée]|me chamo|chamo-me|chamo|aqui [ée]|sou\s+[ao]|sou(?!\s+(?:de|da|do|das|dos)\b)|(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome)\s+(?:(?:somente|apenas)\s+)?(\p{L}+(?:\s+\p{L}+)*)/iu,
    ) || clean.match(/^nome\s+(\p{L}+(?:\s+\p{L}+)*)$/iu);

    if (presentationMatch?.[1]) {
      clean = presentationMatch[1];
    } else {
      // Pattern 3: Suffix format (e.g. "Wanderson Chaves, esse é meu nome" / "Wanderson Chaves é meu nome")
      const suffixMatch = clean.match(
        /^(\p{L}+(?:\s+\p{L}+)*)[,.]?\s+(?:(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome|[ée]\s+(?:o\s+)?meu\s+nome)$/iu,
      );
      if (suffixMatch?.[1]) {
        clean = suffixMatch[1];
      } else if (!options?.allowBareName) {
        return undefined;
      }
    }
  }

  // Clean stop words and prefixes
  clean = clean
    .replace(/(?:não|nao)\s+tem\s+(?:\S.*)?$/iu, '')
    .replace(/^(?:(?:meu\s+)?nome(?:\s+completo)?\s*:?|meu\s+nome\s+completo\s+[ée]|nome\s+completo\s+[ée]|meu\s+nome\s+correto\s+[ée]|nome\s+correto\s+[ée]|meu\s+nome\s+certo\s+[ée]|nome\s+certo\s+[ée]|meu\s+nome\s+(?:está|tá)\s+errado(?:,\s*sou)?|meu\s+nome\s+[ée]|me\s+chamo|chamo-me|chamo|sou\s+[ao]|sou|aqui\s+[ée]|(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome:?|somente|apenas)\s+/iu, '')
    .replace(/[,.]?\s*(?:(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome|[ée]\s+(?:o\s+)?meu\s+nome)$/iu, '')
    .replace(/,?\s*(?:gostaria sim|gostaria|sim, pode|sim|pode mandar|aceito|quero|obrigado|obrigada).*/iu, '')
    .trim();

  if (isInvalidName(clean)) {
    return undefined;
  }

  if (/^[\p{L}\s]{2,40}$/iu.test(clean)) {
    const parts = clean.split(/\s+/).filter(Boolean);
    const capitalized = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return sanitizeName(capitalized);
  }

  return undefined;
}

/**
 * Helper to extract person name from a message without capturing stop words.
 * Supports multi-line structured input and presentation prefixes.
 * @param text - Clean message text to extract name from.
 * @param options - Extraction options.
 * @param options.allowBareName - Whether bare text without presentation prefix can be considered a name.
 */
export function extractNameFromText(text: string, options?: { allowBareName?: boolean }): string | undefined {
  if (!text || typeof text !== 'string') {
    return undefined;
  }

  // Se o texto tiver múltiplas linhas (ex: dados cadastrais enviados linha por linha)
  if (text.includes('\n')) {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    // Passo 1: Verifica se alguma linha contém prefixo ou correção explícita de nome
    for (const line of lines) {
      const extracted = extractNameFromSingleLine(line, { allowBareName: false });
      if (extracted) {
        return extracted;
      }
    }

    // Passo 2: Se não encontrou prefixo explícito em nenhuma linha,
    // verifica se alguma linha é um nome próprio (ex: "Wanderson Chaves")
    // se a mensagem contiver outros dados de cadastro ou se allowBareName estiver ativo
    const hasOtherRegistrationFields = (
      lines.some(l => l.includes('@'))
      || lines.some(l => Boolean(extractAddressFromText(l)))
      || lines.some(l => extractGenerationFromText(l) !== undefined)
      || lines.some(l => extractAttemptedOutOfRangeGeneration(l) !== undefined)
      || lines.some(l => extractMinistryActionsFromText(l).length > 0)
    );

    if (hasOtherRegistrationFields || options?.allowBareName) {
      for (const line of lines) {
        if (
          line.includes('@')
          || extractAddressFromText(line)
          || extractGenerationFromText(line) !== undefined
          || extractAttemptedOutOfRangeGeneration(line) !== undefined
          || extractMinistryActionsFromText(line).length > 0
        ) {
          continue;
        }

        const candidate = extractNameFromSingleLine(line, { allowBareName: true });
        if (candidate) {
          return candidate;
        }
      }
    }

    return undefined;
  }

  return extractNameFromSingleLine(text, options);
}

/**
 * Extracts a candidate address from text using Brazilian street patterns or address prefixes.
 * @param text - Message text.
 * @returns Clean address string or undefined.
 */
export function extractAddressFromText(text: string): string | undefined {
  const clean = text.replace(/\[.*?\]/g, '').trim();

  // Pattern 1: explicit prefix "meu endereço é ...", "endereço: ...", "moro na/em ..."
  const explicitMatch = clean.match(/(?:meu\s+endereço\s+(?:é|e)|endereço\s+(?:é|e)|endereço:|moro\s+na|moro\s+no|moro\s+em)\s+([^.\n]+)/iu);
  if (explicitMatch?.[1]) {
    const candidate = explicitMatch[1].trim();
    if (candidate.length >= 5 && candidate.length <= 255) {
      return candidate;
    }
  }

  // Pattern 2: Street format (e.g. "Rua Ferroviaria, 8400", "Av. Paulista, 1000", "Quadra 10 Lote 5")
  const streetMatch = clean.match(/\b(?:rua|r\.|av\.|avenida|travessa|tv\.|rodovia|alameda|praça|praca|quadra|qd\.|lote|lt\.|estrada|vila|bairro)\s+[^,\n]+(?:,[\w\s/-]+)?/iu);
  if (streetMatch?.[0]) {
    const candidate = streetMatch[0].trim();
    if (candidate.length >= 5 && candidate.length <= 255) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Extracts G12 generation slot (1 to 12) from text.
 * Supports "Geração 3", "G12", "F3", "Frente 4", "Geração F3", "F12".
 * @param text - Message text.
 * @returns Generation slot integer between 1 and 12, or undefined.
 */
export function extractGenerationFromText(text: string): number | undefined {
  const clean = text.replace(/\[.*?\]/g, '').trim().toLowerCase();

  // Match "geração 3", "geracao f12", "frente 4", "geração: f5", "g12", "f3", "f 12"
  const match = clean.match(
    /\b(?:geração|geracao|frente)(?:\s*:\s*|\s+)?(?:[gf]\s*)?([1-9]|1[0-2])\b|\b[gf]\s*([1-9]|1[0-2])\b/iu,
  );
  const matchedSlot = match?.[1] ?? match?.[2];
  if (matchedSlot) {
    const slot = Number.parseInt(matchedSlot, 10);
    if (slot >= 1 && slot <= 12) {
      return slot;
    }
  }

  return undefined;
}

/**
 * Detects attempted generation/frente numbers outside the 1 to 12 range (e.g. F13, Geração 15).
 * @param text - Message text.
 * @returns The out-of-range number if detected, otherwise undefined.
 */
export function extractAttemptedOutOfRangeGeneration(text: string): number | undefined {
  const clean = text.replace(/\[.*?\]/g, '').trim().toLowerCase();

  const match = clean.match(
    /\b(?:geração|geracao|frente)(?:\s*:\s*|\s+)?(?:[gf]\s*)?(\d+)\b|\b[gf]\s*(\d+)\b/iu,
  );
  const matchedSlot = match?.[1] ?? match?.[2];
  if (matchedSlot) {
    const slot = Number.parseInt(matchedSlot, 10);
    if (slot < 1 || slot > 12) {
      return slot;
    }
  }

  return undefined;
}

/**
 * Extracts church ministries and participation actions from text.
 * @param text - Message text.
 * @returns Array of detected ministry actions.
 */
export function extractMinistryActionsFromText(text: string): MinistryAction[] {
  const clean = text.replace(/\[.*?\]/g, '').trim().toLowerCase();
  const results: MinistryAction[] = [];

  const removeKeywords = [
    'saí do',
    'sai do',
    'saí da',
    'sai da',
    'não participo mais do',
    'nao participo mais do',
    'não participo mais da',
    'nao participo mais da',
    'remover do',
    'remover da',
    'sair do',
    'sair da',
  ];
  const isRemove = removeKeywords.some(kw => clean.includes(kw));
  const action: 'ADD' | 'REMOVE' = isRemove ? 'REMOVE' : 'ADD';

  // Common church ministries
  const ministryKeywords = [
    { key: 'louvor', name: 'Louvor & Adoração' },
    { key: 'música', name: 'Louvor & Adoração' },
    { key: 'musica', name: 'Louvor & Adoração' },
    { key: 'mídia', name: 'Mídia & Produção' },
    { key: 'midia', name: 'Mídia & Produção' },
    { key: 'som', name: 'Mídia & Produção' },
    { key: 'kids', name: 'TelePaz Filadélfia Kids' },
    { key: 'filadélfia kids', name: 'TelePaz Filadélfia Kids' },
    { key: 'filadelfia kids', name: 'TelePaz Filadélfia Kids' },
    { key: 'infantil', name: 'TelePaz Filadélfia Kids' },
    { key: 'crianças', name: 'TelePaz Filadélfia Kids' },
    { key: 'criancas', name: 'TelePaz Filadélfia Kids' },
    { key: 'consolidação', name: 'Consolidação' },
    { key: 'consolidacao', name: 'Consolidação' },
    { key: 'intercessão', name: 'Intercessão' },
    { key: 'intercessao', name: 'Intercessão' },
    { key: 'apoio', name: 'Apoio & Logística' },
    { key: 'logística', name: 'Apoio & Logística' },
    { key: 'logistica', name: 'Apoio & Logística' },
    { key: 'recepção', name: 'Recepção' },
    { key: 'recepcao', name: 'Recepção' },
    { key: 'dança', name: 'Dança' },
    { key: 'danca', name: 'Dança' },
    { key: 'teatro', name: 'Teatro' },
    { key: 'diaconato', name: 'Diaconato' },
  ];

  for (const item of ministryKeywords) {
    if (clean.includes(item.key)) {
      if (!results.some(r => r.name === item.name)) {
        results.push({ name: item.name, action });
      }
    }
  }

  return results;
}

/**
 * Fallback heurístico simples caso a API de IA falhe ou esteja desconfigurada.
 * Prioriza a última mensagem recebida para evitar que termos de conversas antigas contaminem a intenção.
 * @param currentText - Current message content.
 * @param _fullContext - Optional accumulated context.
 */
function ruleBasedAnalysis(currentText: string, _fullContext?: string): AIExtractionResult {
  const cleanCurrent = currentText.replace(/\[.*?\]/g, '').trim();
  const normalizedCurrent = removeDiacritics(cleanCurrent);

  const emailMatch = cleanCurrent.match(/[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const extractedEmail = emailMatch ? emailMatch[0] : undefined;
  const extractedAddress = extractAddressFromText(cleanCurrent);
  const extractedGeneration = extractGenerationFromText(cleanCurrent);
  const extractedOutOfRangeGen = !extractedGeneration
    ? extractAttemptedOutOfRangeGeneration(cleanCurrent)
    : undefined;
  const extractedMinistries = extractMinistryActionsFromText(cleanCurrent);

  // 1. Confirmação explícita de opt-in na mensagem atual ("sim, gostaria de receber", "pode mandar", "sim", "aceito")
  const confirmPhrases = [
    'sim, gostaria de receber',
    'sim gostaria de receber',
    'gostaria de receber',
    'sim, gostaria',
    'gostaria sim',
    'pode mandar',
    'pode enviar',
    'sim, pode',
    'sim pode',
    'aceito',
    'quero receber',
    'quero',
    'sim',
    'ok',
    'correto',
    'certo',
    'esta correto',
    'ta certo',
    'sou eu',
    'sou eu mesma',
    'sou eu mesmo',
    'isso mesmo',
    'isso',
  ];

  const isConfirmation = confirmPhrases.some(kw =>
    normalizedCurrent === kw
    || normalizedCurrent.startsWith(`${kw} `)
    || normalizedCurrent.endsWith(` ${kw}`)
    || normalizedCurrent.includes('gostaria de receber')
    || normalizedCurrent.includes('gostaria sim')
    || normalizedCurrent.includes('pode mandar'),
  );

  if (isConfirmation) {
    return {
      intent: 'CONFIRMED',
      detectedName: undefined,
      detectedEmail: extractedEmail,
      detectedOptIn: true,
      isDifferentPerson: false,
      rawDetails: 'Confirmed via latest message confirmation keyword',
    };
  }

  // 2. Extrai nome a partir da mensagem atual antecipadamente
  let extractedName = extractNameFromText(cleanCurrent);
  if (!extractedName && _fullContext) {
    const isNameFollowUp = /(?:esse|este)\s+[ée]\s+(?:o\s+)?meu\s+nome|[ée]\s+(?:o\s+)?meu\s+nome|meu\s+nome/iu.test(normalizedCurrent);
    if (isNameFollowUp) {
      extractedName = extractNameFromText(_fullContext);
    }
  }

  // 3. Recusa explícita de mensagens ("não quero receber", "não envie mais", "parar", "stop", "sair")
  const explicitOptOutPhrases = [
    'nao quero receber',
    'nao quero mais receber',
    'nao envie mais',
    'nao mande mais',
    'nao mande mensagem',
    'nao envie mensagem',
    'nao quero mensagens',
    'nao quero mais mensagens',
    'remova meu numero',
    'remover meu numero',
    'remova meu contato',
    'remover meu contato',
    'tire meu numero',
    'cancele mensagens',
    'cancelar mensagens',
    'cancelar comunicacao',
    'parar',
    'stop',
    'sair',
  ];

  const isExplicitOptOut = explicitOptOutPhrases.some(kw =>
    normalizedCurrent === kw
    || normalizedCurrent.startsWith(`${kw} `)
    || normalizedCurrent.endsWith(` ${kw}`)
    || normalizedCurrent.includes(kw),
  );

  if (isExplicitOptOut && !extractedName) {
    return {
      intent: 'OTHER',
      detectedOptIn: false,
      isDifferentPerson: false,
      rawDetails: 'Opt-out via latest message rejection keyword',
    };
  }

  // 4. Contestação ou rejeição de dados ("está errado", "não está certo", "não confirmo", "não", "meu nome não é esse", etc.)
  // IMPORTANTE: Contestar dados ou responder "não" em relação ao cadastro NÃO é opt-out de mensagens!
  const dataContestationPhrases = [
    'esta errado',
    'ta errado',
    'nao esta certo',
    'nao ta certo',
    'nao confirmo',
    'dados errados',
    'dados incorretos',
    'nome errado',
    'nao e esse',
    'nao e esse nome',
    'nao e esse o meu nome',
    'esse nao e meu nome',
    'nao e meu nome',
    'meu nome nao e esse',
    'meu nome ta errado',
    'meu nome esta errado',
    'cadastro errado',
    'informacao errada',
    'informacao incorreta',
    'incorreto',
    'esta tudo errado',
    'ta tudo errado',
    'tudo errado',
    'nao sou esse',
    'nao sou essa pessoa',
    'nao e essa pessoa',
    'nao me chamo assim',
    'errado',
    'errada',
  ];

  const isDataContestation = (
    normalizedCurrent === 'nao'
    || normalizedCurrent === 'nao nao'
    || dataContestationPhrases.some(kw => normalizedCurrent.includes(kw))
  );

  if (isDataContestation) {
    return {
      intent: 'OUTDATED_DATA',
      detectedName: extractedName,
      detectedEmail: extractedEmail,
      detectedAddress: extractedAddress,
      detectedGeneration: extractedGeneration,
      detectedMinistries: extractedMinistries.length > 0 ? extractedMinistries : undefined,
      detectedOptIn: null,
      isDifferentPerson: false,
      rawDetails: 'Contested data or rejected without opting out of communication',
    };
  }

  // 5. Aviso de número errado ("não me chamo", "não sou", "número errado", "não tem...")
  const wrongKeywords = [
    'nao sou',
    'nao me chamo',
    'numero errado',
    'nao e ele',
    'nao e ela',
    'nao conhece',
    'nao sei quem',
    'desconheco',
    'outro dono',
    'engano',
    'nao tem',
    'nao moro',
    'meu nome nao e esse',
    'nao e meu nome',
    'esse nao e meu nome',
  ];

  const hasWrongKeyword = wrongKeywords.some(kw => normalizedCurrent.includes(kw));
  if (hasWrongKeyword) {
    let detectedOptIn: boolean | null = null;
    if (normalizedCurrent.includes('nao quero') || normalizedCurrent.includes('nao envie')) {
      detectedOptIn = false;
    } else {
      // Remove correções de nome do tipo "e sim [Nome]" / "mas sim [Nome]" para não confundir com consentimento
      const withoutNameCorrection = normalizedCurrent.replace(/(?:e|mas)\s+sim\s+\p{L}+/giu, '');
      if (
        withoutNameCorrection.includes('pode mandar')
        || withoutNameCorrection.includes('pode enviar')
        || withoutNameCorrection.includes('aceito')
        || withoutNameCorrection.includes('gostaria')
        || /\bsim\b/iu.test(withoutNameCorrection)
      ) {
        detectedOptIn = true;
      }
    }

    return {
      intent: 'WRONG_NUMBER',
      detectedName: extractedName,
      detectedEmail: extractedEmail,
      detectedOptIn,
      isDifferentPerson: true,
      rawDetails: 'Detected via wrong number keywords in current message',
    };
  }

  // 6. Se enviou e-mail, endereço, geração ou ministério
  if (
    extractedEmail
    || extractedAddress
    || extractedGeneration !== undefined
    || extractedOutOfRangeGen !== undefined
    || extractedMinistries.length > 0
  ) {
    return {
      intent: 'OUTDATED_DATA',
      detectedEmail: extractedEmail,
      detectedAddress: extractedAddress,
      detectedGeneration: extractedGeneration,
      detectedAttemptedOutOfRangeGeneration: extractedOutOfRangeGen,
      detectedMinistries: extractedMinistries.length > 0 ? extractedMinistries : undefined,
      detectedName: extractedName,
      detectedOptIn: null,
      isDifferentPerson: false,
      rawDetails: 'Extracted registration data via rule-based analysis',
    };
  }

  // 7. Se enviou nome próprio
  if (extractedName && cleanCurrent.length < 50) {
    return {
      intent: 'OUTDATED_DATA',
      detectedName: extractedName,
      detectedEmail: extractedEmail,
      detectedAddress: extractedAddress,
      detectedGeneration: extractedGeneration,
      detectedAttemptedOutOfRangeGeneration: extractedOutOfRangeGen,
      detectedMinistries: extractedMinistries.length > 0 ? extractedMinistries : undefined,
      detectedOptIn: null,
      isDifferentPerson: false,
      rawDetails: 'Extracted name via rule-based analysis',
    };
  }

  // 8. Palavras-chave de atualização
  const updateKeywords = [
    'meu email',
    'meu e-mail',
    'mudei de',
    'mudou',
    'endereco novo',
    'novo endereco',
    'atualizar cadastro',
    'atualizar meus dados',
    'atualizar dados',
    'mudar dados',
    'corrigir cadastro',
    'corrigir dados',
    'corrigir meu nome',
    'trocar meu nome',
    'alterar meu nome',
    'meu nome e',
    'me chamo',
    'chamo-me',
    'nome correto',
    'nome certo',
    'nome:',
    'nome ',
    'esse e meu nome',
    'esse e o meu nome',
    'este e meu nome',
    'e meu nome',
  ];

  for (const kw of updateKeywords) {
    if (normalizedCurrent.includes(kw)) {
      return {
        intent: 'OUTDATED_DATA',
        detectedName: extractedName,
        detectedEmail: extractedEmail,
        detectedAddress: extractedAddress,
        detectedGeneration: extractedGeneration,
        detectedAttemptedOutOfRangeGeneration: extractedOutOfRangeGen,
        detectedMinistries: extractedMinistries.length > 0 ? extractedMinistries : undefined,
        detectedOptIn: null,
        isDifferentPerson: false,
        rawDetails: 'Detected via rule-based update keywords',
      };
    }
  }

  return {
    intent: 'OTHER',
    detectedName: extractedName,
    detectedEmail: extractedEmail,
    detectedAddress: extractedAddress,
    detectedGeneration: extractedGeneration,
    detectedAttemptedOutOfRangeGeneration: extractedOutOfRangeGen,
    detectedMinistries: extractedMinistries.length > 0 ? extractedMinistries : undefined,
    detectedOptIn: null,
    isDifferentPerson: false,
    rawDetails: 'Fallback default classification',
  };
}
