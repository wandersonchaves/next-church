import { EvolutionGoClient } from '@/libs/evolution-go/client';

/**
 * Migration: Evolution API (Node) -> Evolution GO (v2)
 * Integrated Service for WhatsApp Communications.
 */
export const WhatsAppService = {
  /**
   * Envia uma mensagem de texto via Evolution GO v2.
   * @param params - Parâmetros para envio da mensagem de WhatsApp.
   * @param params.phone - Número de telefone do destinatário com DDD.
   * @param params.message - Texto da mensagem a ser enviada.
   * @param params.organizationId - Identificador opcional da organização.
   * @param params.overrides - Configurações opcionais de substituição da instância.
   * @param params.overrides.instanceName - Nome da instância customizada.
   * @param params.overrides.apiKey - Chave de API customizada.
   * @param params.memberId - Identificador opcional do membro.
   * @returns Resultado do envio com status e detalhes.
   */
  sendMessage: async (params: {
    phone: string;
    message: string;
    organizationId?: string;
    overrides?: { instanceName?: string; apiKey?: string };
    memberId?: string | null;
  }) => {
    const { phone, message, organizationId, overrides, memberId } = params;
    const client = EvolutionGoClient.getInstance();

    try {
      const result = await client.sendMessage(phone, message, organizationId, overrides, memberId);
      return result;
    } catch (error) {
      console.error('[WHATSAPP_SERVICE_ERROR]', error);
      return { sent: false, error: String(error) };
    }
  },
};
