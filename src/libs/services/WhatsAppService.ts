import { EvolutionGoClient } from '@/libs/evolution-go/client';

/**
 * Migration: Evolution API (Node) -> Evolution GO (v2)
 * Integrated Service for WhatsApp Communications.
 */
export const WhatsAppService = {
  /**
   * Envia uma mensagem de texto via Evolution GO v2.
   */
  sendMessage: async (params: {
    phone: string;
    message: string;
    organizationId?: string;
    overrides?: { instanceName?: string; apiKey?: string };
  }) => {
    const { phone, message, organizationId, overrides } = params;
    const client = EvolutionGoClient.getInstance();
    
    try {
      const result = await client.sendMessage(phone, message, organizationId, overrides);
      return result;
    } catch (error) {
      console.error('[WHATSAPP_SERVICE_ERROR]', error);
      return { sent: false, error: String(error) };
    }
  },
};
