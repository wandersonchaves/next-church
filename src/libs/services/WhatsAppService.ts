/**
 * Serviço de integração com a Evolution API para envio de mensagens de WhatsApp.
 */
export const WhatsAppService = {
  /**
   * Envia uma mensagem de texto via Evolution API seguindo o padrão exato do Postman.
   * @param phone - O número do telefone (ex: 86995206925). O prefixo 55 será adicionado se faltar.
   * @param message - O conteúdo da mensagem em texto.
   */
  sendMessage: async (phone: string, message: string) => {
    const API_URL = process.env.EVOLUTION_API_URL;
    const API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE = process.env.EVOLUTION_INSTANCE;

    if (!API_URL || !API_KEY || !INSTANCE) {
      console.warn('[WHATSAPP_SERVICE] Erro: Variáveis de ambiente da Evolution API não configuradas.');
      return { sent: false, reason: 'CONFIG_MISSING' };
    }

    try {
      // 1. Limpa todos os caracteres não numéricos
      let cleanNumber = phone.replace(/\D/g, '');

      // 2. Normalização Staff-level: Garante o prefixo 55 (Brasil)
      // Se o número tiver 10 ou 11 dígitos (DDD + Número), adicionamos o 55.
      if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
        cleanNumber = `55${cleanNumber}`;
      }

      const url = `${API_URL.replace(/\/$/, '')}/message/sendText/${INSTANCE}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return { sent: true, data };
    } catch (error) {
      console.error('[WHATSAPP_SEND_ERROR]', error);
      return { sent: false, error: String(error) };
    }
  },
};
