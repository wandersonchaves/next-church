export type EmojiItem = {
  emoji: string;
  name: string;
  keywords: string[];
};

export type EmojiCategory = {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
};

export const QUICK_EMOJIS = [
  '🙏',
  '🔥',
  '✨',
  '❤️',
  '📖',
  '⛪',
  '🕊️',
  '🙌',
  '👥',
  '🎉',
  '👏',
  '👋',
  '📢',
  '⏰',
  '📍',
  '✝️',
];

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'faith',
    label: 'Fé & Igreja',
    icon: '⛪',
    emojis: [
      { emoji: '🙏', name: 'Mãos em Oração', keywords: ['oracao', 'orando', 'orar', 'pray', 'prayer', 'gratidao', 'fe', 'faith', 'grato', 'amem', 'bencao'] },
      { emoji: '⛪', name: 'Igreja / Templo', keywords: ['igreja', 'templo', 'church', 'culto', 'casa do senhor', 'comunhao', 'sanctuary'] },
      { emoji: '📖', name: 'Bíblia Sagrada', keywords: ['biblia', 'bible', 'palavra', 'leitura', 'devocional', 'versiculo', 'escritura', 'livro', 'book'] },
      { emoji: '🕊️', name: 'Pomba da Paz / Espírito Santo', keywords: ['pomba', 'espirito santo', 'holy spirit', 'paz', 'peace', 'batismo', 'dove'] },
      { emoji: '✝️', name: 'Cruz Latina', keywords: ['cruz', 'cross', 'cristo', 'jesus', 'salvacao', 'calvario', 'evangelho', 'gospel'] },
      { emoji: '🕯️', name: 'Vela / Luz', keywords: ['vela', 'luz', 'candle', 'vigilia', 'oracao', 'presenca', 'chama'] },
      { emoji: '🍞', name: 'Pão / Santa Ceia', keywords: ['pao', 'ceia', 'santa ceia', 'comunhao', 'bread', 'communion'] },
      { emoji: '🍇', name: 'Uvas / Fruto da Videira', keywords: ['uva', 'vinho', 'ceia', 'fruto', 'videira', 'grapes', 'fruit'] },
      { emoji: '👑', name: 'Coroa / Rei dos Reis', keywords: ['coroa', 'rei', 'cristo rei', 'realeza', 'crown', 'king', 'lord', 'soberano'] },
      { emoji: '🐑', name: 'Cordeiro / Ovelha', keywords: ['ovelha', 'pastor', 'cordeiro', 'rebanho', 'sheep', 'lamb', 'jesus'] },
      { emoji: '🛡️', name: 'Escudo da Fé', keywords: ['escudo', 'fe', 'protecao', 'armadura', 'shield', 'defesa'] },
      { emoji: '⚔️', name: 'Espada do Espírito', keywords: ['espada', 'palavra de deus', 'armadura', 'sword', 'guerra espiritual'] },
      { emoji: '🎺', name: 'Trombeta / Shofar', keywords: ['trombeta', 'shofar', 'trompete', 'louvor', 'despertar', 'trumpet'] },
      { emoji: '🏛️', name: 'Altar / Templo', keywords: ['altar', 'templo', 'colunas', 'casa', 'instituicao'] },
    ],
  },
  {
    id: 'emotions',
    label: 'Rostos & Emoções',
    icon: '😀',
    emojis: [
      { emoji: '😀', name: 'Sorriso Aberto', keywords: ['sorriso', 'feliz', 'smile', 'alegre', 'happy', 'rosto'] },
      { emoji: '😃', name: 'Sorriso com Olhos Grandes', keywords: ['sorridente', 'alegria', 'animado', 'joy'] },
      { emoji: '😄', name: 'Sorriso Contente', keywords: ['contente', 'risonho', 'felicidade', 'riso'] },
      { emoji: '😁', name: 'Sorriso Radiante', keywords: ['radiante', 'dentes', 'beaming', 'alegre'] },
      { emoji: '😊', name: 'Sorriso Amável', keywords: ['carinho', 'simpatico', 'suave', 'acolhedor', 'blush', 'gentil'] },
      { emoji: '😇', name: 'Abençoado / Anjo', keywords: ['anjo', 'abencoado', 'blessed', 'inocente', 'puro', 'angel'] },
      { emoji: '🥰', name: 'Coração e Sorriso', keywords: ['amoroso', 'apaixonado', 'carinhoso', 'love', 'afeto'] },
      { emoji: '😍', name: 'Olhos de Coração', keywords: ['encantado', 'amando', 'olhos de coracao', 'in love'] },
      { emoji: '🤩', name: 'Deslumbrado', keywords: ['impressionado', 'starry eyes', 'uau', 'brilho', 'maravilha'] },
      { emoji: '🥹', name: 'Emocionado / Gratidão', keywords: ['emocionado', 'lagrimas de alegria', 'gratidao', 'touched', 'tocado'] },
      { emoji: '🤗', name: 'Abraço Acolhedor', keywords: ['abraco', 'acolhimento', 'hugging', 'bem vindo', 'acolher'] },
      { emoji: '🤔', name: 'Pensando / Reflexão', keywords: ['pensando', 'refletindo', 'duvida', 'thinking', 'meditacao'] },
      { emoji: '😎', name: 'Firme e Confiante', keywords: ['firme', 'confiante', 'animado', 'cool', 'forte'] },
      { emoji: '🥳', name: 'Comemoração / Festa', keywords: ['celebrando', 'comemorando', 'parabens', 'festa', 'celebrating', 'aniversario'] },
      { emoji: '😌', name: 'Em Paz / Aliviado', keywords: ['aliviado', 'em paz', 'descansando', 'peaceful', 'relieved', 'tranquilo'] },
      { emoji: '😴', name: 'Descanso / Sono', keywords: ['dormindo', 'descansando', 'sono', 'boa noite', 'sleep', 'paz'] },
    ],
  },
  {
    id: 'people',
    label: 'Gestos & Pessoas',
    icon: '🙌',
    emojis: [
      { emoji: '🙌', name: 'Mãos Levantadas em Louvor', keywords: ['louvor', 'maos levantadas', 'aleluia', 'gloria', 'gratidao', 'praise', 'celebration'] },
      { emoji: '👏', name: 'Palmas / Aplausos', keywords: ['palmas', 'aplausos', 'parabens', 'vitoria', 'clapping', 'bravos'] },
      { emoji: '👋', name: 'Aceno / A Paz', keywords: ['aceno', 'ola', 'oi', 'a paz', 'tchau', 'wave', 'greeting'] },
      { emoji: '🤝', name: 'Aperto de Mão / Aliança', keywords: ['aperto de mao', 'uniao', 'parceria', 'acordo', 'handshake', 'alianca'] },
      { emoji: '🫂', name: 'Abraço Fraterno', keywords: ['pessoas se abracando', 'abraco fraterno', 'consolo', 'uniao', 'hug', 'comunhao'] },
      { emoji: '👍', name: 'Joinha / Confirmado', keywords: ['legal', 'joinha', 'confirmacao', 'aprovado', 'ok', 'thumbs up', 'sim'] },
      { emoji: '✌️', name: 'Paz e Vitória', keywords: ['paz', 'vitoria', 'paz e amor', 'peace', 'dois'] },
      { emoji: '🤞', name: 'Esperança / Torcida', keywords: ['torcendo', 'esperanca', 'crossed fingers', 'fe'] },
      { emoji: '👥', name: 'Célula / Grupo de Pessoas', keywords: ['pessoas', 'grupo', 'celula', 'discipulado', 'rede', 'time', 'team', 'members'] },
      { emoji: '👤', name: 'Membro / Integrante', keywords: ['pessoa', 'membro', 'lider', 'integrante', 'user', 'contato'] },
      { emoji: '👨‍👩‍👧‍👦', name: 'Família', keywords: ['familia', 'family', 'casal', 'filhos', 'lar', 'pais'] },
      { emoji: '🧑‍🤝‍🧑', name: 'Irmãos / Comunhão', keywords: ['comunhao', 'amigos', 'juntos', 'casal', 'uniao', 'parceiros'] },
      { emoji: '🏃', name: 'Correndo a Carreira', keywords: ['correndo', 'corrida', 'jornada', 'avancar', 'run', 'alvo'] },
      { emoji: '🚶', name: 'Caminhada na Fé', keywords: ['caminhando', 'caminhada', 'passos', 'walk', 'seguidor'] },
      { emoji: '🗣️', name: 'Testemunho / Voz', keywords: ['falando', 'testemunho', 'proclamar', 'pregar', 'speak', 'voz'] },
      { emoji: '👂', name: 'Ouvindo a Palavra', keywords: ['ouvindo', 'atencao', 'escutar', 'ouvir a palavra', 'hear', 'obedecer'] },
    ],
  },
  {
    id: 'symbols',
    label: 'Corações & Símbolos',
    icon: '❤️',
    emojis: [
      { emoji: '❤️', name: 'Coração Vermelho', keywords: ['coracao', 'vermelho', 'amor', 'red heart', 'love', 'paixao', 'deus e amor'] },
      { emoji: '🤍', name: 'Coração Branco', keywords: ['coracao branco', 'paz', 'pureza', 'white heart', 'pure', 'santidade'] },
      { emoji: '💙', name: 'Coração Azul', keywords: ['coracao azul', 'blue heart', 'confianca', 'fidelidade', 'graca'] },
      { emoji: '💚', name: 'Coração Verde', keywords: ['coracao verde', 'green heart', 'esperanca', 'vida', 'crescimento'] },
      { emoji: '💛', name: 'Coração Amarelo', keywords: ['coracao amarelo', 'yellow heart', 'amizade', 'carinho', 'luz'] },
      { emoji: '💜', name: 'Coração Roxo', keywords: ['coracao roxo', 'purple heart', 'nobreza', 'realeza', 'honra'] },
      { emoji: '💖', name: 'Coração com Brilho', keywords: ['coracao brilhante', 'sparkling heart', 'amor especial', 'brilho'] },
      { emoji: '🔥', name: 'Fogo / Avivamento', keywords: ['fogo', 'chama', 'avivamento', 'pentecostes', 'poder', 'uncao', 'fire', 'flame'] },
      { emoji: '✨', name: 'Brilho / Glória', keywords: ['brilho', 'gloria', 'estrelas', 'luz', 'sparkles', 'especial', 'milagre'] },
      { emoji: '🌟', name: 'Estrela Reluzente', keywords: ['estrela brilhante', 'glowing star', 'guia', 'brilho', 'jesus'] },
      { emoji: '⭐', name: 'Estrela', keywords: ['estrela', 'destaque', 'star'] },
      { emoji: '⚡', name: 'Poder de Deus', keywords: ['poder', 'raio', 'forca', 'sobrenatural', 'zap', 'lightning'] },
      { emoji: '☀️', name: 'Sol da Justiça', keywords: ['sol', 'amanhecer', 'renovo', 'claridade', 'sun', 'morning', 'dia'] },
      { emoji: '🌈', name: 'Arco da Aliança', keywords: ['arco-iris', 'alianca', 'promessa', 'covenant', 'rainbow', 'fidelidade'] },
      { emoji: '🎯', name: 'Alvo / Meta da Fé', keywords: ['alvo', 'foco', 'objetivo', 'meta', 'target', 'proposito'] },
      { emoji: '💡', name: 'Lâmpada / Revelação', keywords: ['ideia', 'visao', 'revelacao', 'entendimento', 'lightbulb', 'lampada'] },
      { emoji: '💎', name: 'Tesouro / Precioso', keywords: ['joia', 'precioso', 'tesouro', 'diamante', 'gem', 'valor'] },
    ],
  },
  {
    id: 'events',
    label: 'Celebração & Eventos',
    icon: '🎉',
    emojis: [
      { emoji: '🎉', name: 'Festa / Celebração', keywords: ['festa', 'confete', 'celebracao', 'party', 'comemoracao', 'encontro'] },
      { emoji: '🎊', name: 'Conquista / Evento', keywords: ['comemoracao', 'serpentina', 'confetes', 'evento'] },
      { emoji: '🎈', name: 'Balão / Ministério Kids', keywords: ['balao', 'bexiga', 'aniversario', 'kids', 'festividade', 'balloon'] },
      { emoji: '🎂', name: 'Bolo de Aniversário', keywords: ['bolo', 'aniversario', 'comemoracao', 'birthday', 'parabens'] },
      { emoji: '🎁', name: 'Presente / Dádiva', keywords: ['presente', 'bencao', 'dadiva', 'gift', 'mimo'] },
      { emoji: '🏆', name: 'Troféu / Vitória', keywords: ['trofeu', 'vitoria', 'conquista', 'campeao', 'trophy'] },
      { emoji: '🥇', name: 'Medalha de Honra', keywords: ['medalha de ouro', 'primeiro lugar', 'premiacao', 'medal', 'honra'] },
      { emoji: '🎟️', name: 'Convite / Inscrição', keywords: ['ingresso', 'convite', 'ticket', 'inscricao', 'encontro com deus'] },
      { emoji: '🎪', name: 'Acampamento / Retiro', keywords: ['evento', 'acampamento', 'encontro', 'tenda', 'retiro'] },
    ],
  },
  {
    id: 'communication',
    label: 'Comunicação & Tempo',
    icon: '📢',
    emojis: [
      { emoji: '📢', name: 'Aviso Importante', keywords: ['megafone', 'aviso', 'comunicado', 'atencao', 'loudspeaker', 'broadcast'] },
      { emoji: '📣', name: 'Proclamação', keywords: ['megafone', 'chamada', 'proclamacao', 'megaphone'] },
      { emoji: '🔔', name: 'Lembrete / Alerta', keywords: ['sino', 'notificacao', 'lembrete', 'alerta', 'bell', 'atencao'] },
      { emoji: '💬', name: 'Mensagem / Diálogo', keywords: ['balao de fala', 'mensagem', 'conversa', 'chat', 'message'] },
      { emoji: '📱', name: 'WhatsApp / Contato', keywords: ['celular', 'smartphone', 'whatsapp', 'ligacao', 'phone'] },
      { emoji: '📲', name: 'Disparo no Celular', keywords: ['mensagem de celular', 'chamada recebida', 'mobile'] },
      { emoji: '📍', name: 'Localização / Endereço', keywords: ['localizacao', 'local', 'endereco', 'mapa', 'pin', 'location', 'onde'] },
      { emoji: '⏰', name: 'Horário do Culto / Célula', keywords: ['relogio', 'alarme', 'horario', 'pontualidade', 'despertador', 'clock', 'hora'] },
      { emoji: '📅', name: 'Data / Agenda', keywords: ['calendario', 'data', 'dia', 'agenda', 'calendar'] },
      { emoji: '🗓️', name: 'Cronograma Semanal', keywords: ['cronograma', 'planejamento', 'dias', 'schedule', 'semana'] },
      { emoji: '⏳', name: 'Contagem Regressiva', keywords: ['ampulheta', 'contagem regressiva', 'tempo', 'espera', 'hourglass'] },
      { emoji: '✉️', name: 'Carta / Notificação', keywords: ['carta', 'mensagem', 'correspondencia', 'envelope', 'email'] },
      { emoji: '🔗', name: 'Link / Conexão', keywords: ['link', 'conexao', 'link do grupo', 'url'] },
      { emoji: '📝', name: 'Anotações / Relatório', keywords: ['anotacao', 'caderno', 'relatorio', 'nota', 'memo'] },
      { emoji: '📌', name: 'Aviso Fixado', keywords: ['fixado', 'importante', 'aviso fixo', 'pin', 'destaque'] },
    ],
  },
];

export const ALL_EMOJIS: EmojiItem[] = EMOJI_CATEGORIES.flatMap(category => category.emojis);

/**
 * Normalizes text by converting to lowercase and stripping accents for search matching.
 * @param text - Raw input string.
 * @returns Clean accent-insensitive normalized string.
 */
export const normalizeEmojiText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim();
};

/**
 * Searches emojis across name and keywords matching the normalized query string.
 * @param query - The user search query.
 * @param pool - Optional list of emojis to search from (defaults to all).
 * @returns Filtered array of EmojiItem matching the query.
 */
export const searchEmojis = (
  query: string,
  pool: EmojiItem[] = ALL_EMOJIS,
): EmojiItem[] => {
  const normalizedQuery = normalizeEmojiText(query);
  if (!normalizedQuery) {
    return pool;
  }

  return pool.filter((item) => {
    const normalizedName = normalizeEmojiText(item.name);
    if (normalizedName.includes(normalizedQuery)) {
      return true;
    }
    return item.keywords.some(keyword =>
      normalizeEmojiText(keyword).includes(normalizedQuery),
    );
  });
};
