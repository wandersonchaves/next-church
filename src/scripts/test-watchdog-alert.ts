import { Env } from '../libs/Env';
import { WhatsAppService } from '../libs/services/WhatsAppService';
import { AppConfig } from '../utils/AppConfig';
import 'dotenv/config';

/**
 * Script de Teste: Simulação de Alerta de Desconexão (Instância de Alerta)
 */
async function run() {
  const ADMIN_PHONE = '558695206925';
  const ORG_ID = 'org_3AnSpFjJduHOXVTu191GR8W9Iu2';

  console.log(`🚀 Iniciando teste de alerta via Instância de Alerta: ${Env.ALERT_EVOLUTION_INSTANCE}`);

  const message = [
    `🚨 *TESTE DE ALERTA: ${AppConfig.name.toUpperCase()}*`,
    `Este disparo simula o Monitor Automático usando sua *Instância Pessoal* para avisar que a *Instância da Igreja* caiu.`,
    ``,
    `Se você recebeu esta mensagem, a redundância está funcionando perfeitamente!`,
    ``,
    `_Enviado em: ${new Date().toLocaleString('pt-BR')}_`,
  ].join('\n');

  try {
    const result = await WhatsAppService.sendMessage({
      phone: ADMIN_PHONE,
      message,
      organizationId: ORG_ID,
      overrides: {
        instanceName: Env.ALERT_EVOLUTION_INSTANCE,
        apiKey: Env.ALERT_EVOLUTION_API_KEY,
      },
    });

    if (result.sent) {
      console.log('✅ Mensagem de redundância enviada com sucesso!');
    } else {
      console.error('❌ Falha ao enviar:', result.error);
    }
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }

  process.exit(0);
}

run();
