import { Env } from '@/libs/Env';

export type AIExtractionResult = {
  intent: 'WRONG_NUMBER' | 'OUTDATED_DATA' | 'CONFIRMED' | 'OTHER';
  detectedName?: string;
  detectedEmail?: string;
  detectedAddress?: string;
  detectedOptIn?: boolean | null;
  isDifferentPerson: boolean;
  rawDetails?: string;
};

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
 * @param messageContent
 * @param memberName
 * @param fullContext
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
2. "OUTDATED_DATA": O interlocutor corrige seu próprio nome, avisa que o nome cadastrado está incorreto ou desatualizado, ou informa que alguma informação cadastral mudou/está incorreta (ex: "me chamo Wanderson", "meu nome é Wanderson", "não sou Gabriel, sou o Wanderson", "meu nome está errado, sou Wanderson", "meu e-mail mudou para...", "mudei de endereço", "meu e-mail é natalia@gmail.com").
3. "CONFIRMED": O interlocutor confirma que é a pessoa procurada ("sou eu", "sim, sou eu") ou responde "sim" / "pode mandar" / "aceito" para continuar recebendo mensagens da igreja.
4. "OTHER": Outros casos (saudações genéricas como "olá", dúvidas gerais sobre culto/endereço sem alteração de cadastro, ou mensagens sem dados cadastrais).

Extração de Entidades e Consentimento:
- "detectedName": Nome próprio informado da pessoa (ex: "me chamo Wanderson" -> "Wanderson", "meu nome é Wanderson Chaves" -> "Wanderson Chaves", "sou o Carlos" -> "Carlos", "não me chamo Beatriz, sou o Carlos" -> "Carlos"). ATENÇÃO CRÍTICA: Se a pessoa apenas disser que NÃO é alguém (ex: "Não sou a Beatriz", "Não me chamo Gabriel", "Não é a Natália"), o "detectedName" DEVE ser null, pois o nome da nova pessoa NÃO foi informado ainda. NUNCA coloque o nome que foi rejeitado em detectedName.
- "detectedEmail": E-mail informado na mensagem (ex: "natalia@gmail.com").
- "detectedAddress": Endereço informado na mensagem.
- "detectedOptIn": true se a pessoa aceitar/autorizar receber mensagens da igreja (ex: "sim", "pode mandar", "aceito", "quero"), false se a pessoa recusar/não quiser receber mensagens da igreja (ex: "não", "não quero", "não envie mais", "remova meu número", "sou de outra igreja e não quero"), ou null se não respondeu sobre consentimento.
- "isDifferentPerson": true se a intenção for WRONG_NUMBER ou se a pessoa informar explicitamente que o número pertence a outra pessoa diferente de "${memberName}", caso contrário false.
- "rawDetails": Detalhes extras ou resumo da mensagem.

Retorne APENAS um objeto JSON plano exatamente com a estrutura abaixo, sem formatação markdown (sem \`\`\`json) e sem explicações:
{
  "intent": "WRONG_NUMBER" | "OUTDATED_DATA" | "CONFIRMED" | "OTHER",
  "detectedName": string | null,
  "detectedEmail": string | null,
  "detectedAddress": string | null,
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
        return {
          intent: result.intent,
          detectedName: sanitizeName(result.detectedName),
          detectedEmail: result.detectedEmail || undefined,
          detectedAddress: result.detectedAddress || undefined,
          detectedOptIn: typeof result.detectedOptIn === 'boolean' ? result.detectedOptIn : null,
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
 * Helper to extract person name from a message without capturing stop words.
 * @param text
 */
function extractNameFromText(text: string): string | undefined {
  let clean = text.replace(/\[.*?\]/g, '').trim();
  const lower = clean.toLowerCase();

  // Pattern 1: "não me chamo X e sim Y" / "não sou X, sou Y"
  const correctedMatch = lower.match(/(?:não|nao)\s+(?:me chamo|sou|é|e)\s+[^\s,]+,?\s*(?:e sim|sou a|sou o|sou|é a|é o|é|e|mas|aqui é|aqui e|me chamo|chamo-me)\s+([a-záàâãéèêíïóôõöúçñ\s]{2,40})/i);
  if (correctedMatch?.[1]) {
    clean = correctedMatch[1];
  } else {
    // Pattern 2: "Meu nome é Nataly" / "Me chamo Nataly" / "Meu nome é somente Nataly Chaves" / "Nome correto é X"
    const presentationMatch = clean.match(/(?:meu nome correto é|meu nome correto e|nome correto é|nome correto e|meu nome certo é|meu nome certo e|nome certo é|nome certo e|meu nome está errado,?\s*(?:sou|é|me chamo)?|meu nome tá errado,?\s*(?:sou|é|me chamo)?|meu nome é|meu nome e|me chamo|chamo-me|chamo|aqui é|aqui e|sou a|sou o|sou)\s*(?:somente|apenas)?\s+([a-záàâãéèêíïóôõöúçñ\s]{2,40})/i);
    if (presentationMatch?.[1]) {
      clean = presentationMatch[1];
    }
  }

  // Clean stop words and prefixes
  clean = clean
    .replace(/(?:não|nao)\s+tem\s+(?:\S.*)?$/i, '')
    .replace(/^(?:meu\s+nome\s+correto\s+é|meu\s+nome\s+correto\s+e|nome\s+correto\s+é|nome\s+correto\s+e|meu\s+nome\s+certo\s+é|meu\s+nome\s+certo\s+e|meu\s+nome\s+está\s+errado|meu\s+nome\s+tá\s+errado|meu\s+nome\s+é|meu\s+nome\s+e|me\s+chamo|chamo-me|chamo|sou\s+a|sou\s+o|sou|aqui\s+é|aqui\s+e|somente|apenas)\s+/i, '')
    .replace(/,?\s*(?:gostaria sim|gostaria|sim, pode|sim|pode mandar|aceito|quero|obrigado|obrigada).*/i, '')
    .trim();

  const isExcluded = [
    'sim',
    'não',
    'nao',
    'ok',
    'olá',
    'ola',
    'bom dia',
    'boa tarde',
    'boa noite',
    'mídia',
    '[mídia]',
    'me',
    'somente',
    'apenas',
    'visitante',
    'contato',
    'novo',
  ].includes(clean.toLowerCase());

  if (!isExcluded && /^[a-záàâãéèêíïóôõöúçñ\s]{2,40}$/i.test(clean)) {
    const parts = clean.split(/\s+/).filter(Boolean);
    const capitalized = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return sanitizeName(capitalized);
  }

  return undefined;
}

/**
 * Fallback heurístico simples caso a API de IA falhe ou esteja desconfigurada.
 * Prioriza a última mensagem recebida para evitar que termos de conversas antigas contaminem a intenção.
 * @param currentText
 * @param _fullContext
 */
function ruleBasedAnalysis(currentText: string, _fullContext?: string): AIExtractionResult {
  const cleanCurrent = currentText.replace(/\[.*?\]/g, '').trim();
  const normalizedCurrent = cleanCurrent.toLowerCase();

  const emailMatch = cleanCurrent.match(/[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const extractedEmail = emailMatch ? emailMatch[0] : undefined;

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
    'sou eu',
    'sou eu mesma',
    'sou eu mesmo',
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

  // 2. Recusa explícita na mensagem atual ("não quero", "não envie", "parar")
  const optOutPhrases = ['não quero', 'nao quero', 'não envie', 'nao envie', 'não mande', 'nao mande', 'parar', 'remova', 'cancelar', 'sair'];
  const isExplicitOptOut = optOutPhrases.some(kw => normalizedCurrent.includes(kw));
  const isStandaloneNo = normalizedCurrent === 'não' || normalizedCurrent === 'nao';

  if (isExplicitOptOut || isStandaloneNo) {
    return {
      intent: 'OTHER',
      detectedOptIn: false,
      isDifferentPerson: false,
      rawDetails: 'Opt-out via latest message rejection keyword',
    };
  }

  // 3. Extrai nome a partir da mensagem atual
  const extractedName = extractNameFromText(cleanCurrent);

  // 4. Aviso de número errado ("não me chamo", "não sou", "número errado", "não tem...")
  const wrongKeywords = [
    'não sou',
    'nao sou',
    'não me chamo',
    'nao me chamo',
    'numero errado',
    'número errado',
    'não é ele',
    'nao e ele',
    'não é ela',
    'nao e ela',
    'não conhece',
    'nao conhece',
    'não sei quem',
    'nao sei quem',
    'desconheço',
    'desconheco',
    'outro dono',
    'engano',
    'nao tem',
    'não tem',
    'não moro',
    'nao moro',
  ];

  const hasWrongKeyword = wrongKeywords.some(kw => normalizedCurrent.includes(kw));
  if (hasWrongKeyword) {
    let detectedOptIn: boolean | null = null;
    if (normalizedCurrent.includes('não quero') || normalizedCurrent.includes('nao quero')) {
      detectedOptIn = false;
    } else if (normalizedCurrent.includes('pode mandar') || normalizedCurrent.includes('aceito') || normalizedCurrent.includes('sim') || normalizedCurrent.includes('gostaria')) {
      detectedOptIn = true;
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

  // 5. Se enviou e-mail
  if (extractedEmail) {
    return {
      intent: 'OUTDATED_DATA',
      detectedEmail: extractedEmail,
      detectedName: extractedName,
      detectedOptIn: null,
      isDifferentPerson: false,
      rawDetails: 'Extracted email via rule-based analysis',
    };
  }

  // 6. Se enviou nome próprio
  if (extractedName && cleanCurrent.length < 50) {
    return {
      intent: 'OUTDATED_DATA',
      detectedName: extractedName,
      detectedOptIn: null,
      isDifferentPerson: false,
      rawDetails: 'Extracted name via rule-based analysis',
    };
  }

  // 7. Palavras-chave de atualização
  const updateKeywords = [
    'meu email',
    'meu e-mail',
    'mudei de',
    'mudou',
    'endereço novo',
    'endereco novo',
    'atualizar',
    'corrigir',
    'meu nome é',
    'meu nome e',
    'me chamo',
    'chamo-me',
    'nome correto',
    'nome certo',
  ];

  for (const kw of updateKeywords) {
    if (normalizedCurrent.includes(kw)) {
      return {
        intent: 'OUTDATED_DATA',
        detectedName: extractedName,
        detectedOptIn: null,
        isDifferentPerson: false,
        rawDetails: 'Detected via rule-based update keywords',
      };
    }
  }

  return {
    intent: 'OTHER',
    detectedName: extractedName,
    detectedOptIn: null,
    isDifferentPerson: false,
    rawDetails: 'Fallback default classification',
  };
}
