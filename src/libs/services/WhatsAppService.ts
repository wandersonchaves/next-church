
import { EvolutionGoClient } from '@/libs/evolution-go/client';

/**
 * Migration: Evolution API (Node) -> Evolution GO (v2)
 * Integrated Service for WhatsApp Communications.
 */
export const WhatsAppService = {
  /**
   * Envia uma mensagem de texto via Evolution GO v2.
   * @param phone - O número do telefone (ex: 86995206925).
   * @param message - O conteúdo da mensagem em texto.
   * @param organizationId - Opcional, para fins de rastreabilidade.
   */
  sendMessage: async (phone: string, message: string, organizationId?: string) => {
    const client = EvolutionGoClient.getInstance();
    
    try {
      const result = await client.sendMessage(phone, message, organizationId);
      return result;
    } catch (error) {
      console.error('[WHATSAPP_SERVICE_ERROR]', error);
      return { sent: false, error: String(error) };
    }
  },
};
