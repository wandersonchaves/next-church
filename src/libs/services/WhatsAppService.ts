/**
 * Serviço de integração com a Evolution API para envio de mensagens de WhatsApp.
 */
export const WhatsAppService = {
  /**
   * Envia uma mensagem de texto via Evolution API seguindo o padrão exato do Postman.
   * @param phone - O número do telefone do destinatário (ex: 558699999999).
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
      const number = phone.replace(/\D/g, '');

      // Construindo a URL exatamente como no Postman
      const url = `${API_URL.replace(/\/$/, '')}/message/sendText/${INSTANCE}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY, // Cabeçalho exato do seu Postman
        },
        body: JSON.stringify({
          number,
          text: message, // Estrutura exata do seu Postman
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Se a API retornar erro, lançamos uma exceção com o detalhe
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
