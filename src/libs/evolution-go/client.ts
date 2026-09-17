import { Env } from '@/libs/Env';
import { NotificationService } from '@/libs/services/NotificationService';

export type EvolutionGoInstance = {
  instanceName: string;
  status: string;
};

export type SendMessageResult = {
  sent: boolean;
  externalId?: string;
  data?: any;
  error?: string;
  reason?: string;
  status?: number;
  endpoint?: string;
  latencyMs?: number;
};

export type InstanceStatusResult = {
  connected: boolean;
  loggedIn?: boolean;
  name?: string;
  state?: string;
  disconnectReason?: string;
  error?: string;
  latencyMs?: number;
};

export class EvolutionGoClient {
  private static instance: EvolutionGoClient;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  private constructor() {
    this.baseUrl = (Env.EVOLUTION_BASE_URL || 'https://evolution-go.up.railway.app').replace(/\/$/, '');
    this.apiKey = Env.EVOLUTION_API_KEY?.replace(/['"]/g, '').trim() || '';
    this.instanceName = (Env.EVOLUTION_INSTANCE || '').replace(/['"]/g, '').trim();
  }

  public static getInstance(): EvolutionGoClient {
    if (!EvolutionGoClient.instance) {
      EvolutionGoClient.instance = new EvolutionGoClient();
    }
    return EvolutionGoClient.instance;
  }

  /**
   * Helper to mask API keys for safe logging.
   * @param secret - Chave ou segredo a ser mascarado para log seguro.
   * @returns Chave mascarada para exibição segura.
   */
  private maskSecret(secret: string): string {
    if (!secret || secret.length <= 6) {
      return '***';
    }
    return `${secret.slice(0, 4)}...${secret.slice(-3)}`;
  }

  /**
   * Resolves phone number candidates for Brazilian WhatsApp accounts.
   * In Brazil (DDI 55), DDDs outside SP (DDD > 19) use 12-digit JIDs on WhatsApp.
   * @param phone - Número de telefone bruto para resolução de variações.
   * @returns Lista de candidatos de números normalizados.
   */
  private getPhoneCandidates(phone: string): string[] {
    let clean = phone.replace(/\D/g, '');
    if (!clean) {
      return [];
    }

    if (clean.length >= 10 && !clean.startsWith('55')) {
      clean = `55${clean}`;
    }

    const candidates: string[] = [];

    if (clean.startsWith('55')) {
      if (clean.length === 13 && clean[4] === '9') {
        const ddd = Number.parseInt(clean.slice(2, 4), 10);
        if (ddd > 19) {
          // For DDDs outside SP (e.g. 86 Piauí), 12-digit JID without 9th digit is primary
          const without9 = `55${clean.slice(2, 4)}${clean.slice(5)}`;
          candidates.push(without9);
          candidates.push(clean);
        } else {
          candidates.push(clean);
          const without9 = `55${clean.slice(2, 4)}${clean.slice(5)}`;
          candidates.push(without9);
        }
      } else if (clean.length === 12) {
        candidates.push(clean);
        const with9 = `55${clean.slice(2, 4)}9${clean.slice(4)}`;
        candidates.push(with9);
      } else {
        candidates.push(clean);
      }
    } else {
      candidates.push(clean);
    }

    return [...new Set(candidates)];
  }

  /**
   * Sends a text message via Evolution GO v2.
   * Uses candidate resolution and clean JSON payload for instant socket delivery.
   * @param to - Destination phone number
   * @param text - Text message content
   * @param organizationId - Optional organization ID for automatic logging
   * @param overrides - Optional instance and API key overrides
   * @param overrides.instanceName - Nome da instância customizada para envio.
   * @param overrides.apiKey - Chave de API customizada para autenticação.
   * @param memberId - Identificador opcional do membro para rastreamento no log.
   * @returns SendMessageResult
   */
  public async sendMessage(
    to: string,
    text: string,
    organizationId?: string,
    overrides?: { instanceName?: string; apiKey?: string },
    memberId?: string | null,
  ): Promise<SendMessageResult> {
    const apiKey = overrides?.apiKey || this.apiKey;
    const instanceName = overrides?.instanceName || this.instanceName;

    if (!apiKey) {
      console.warn('[EVOLUTION] Warning: API Key is not configured in environment variables.');
      return { sent: false, reason: 'CONFIG_MISSING', error: 'API Key not configured' };
    }

    const phoneCandidates = this.getPhoneCandidates(to);

    const endpoints = [
      `${this.baseUrl}/send/text`,
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    };

    if (instanceName) {
      headers.instance = instanceName;
    }

    console.warn(`[EVOLUTION] [SEND_START] Recipient: ${to} (Candidates: ${phoneCandidates.join(', ')}) | Instance: ${instanceName || 'default'} | Server: ${this.baseUrl} | Key: ${this.maskSecret(apiKey)}`);

    let lastError = '';
    let lastStatus = 0;

    for (const num of phoneCandidates) {
      const body = JSON.stringify({
        number: num,
        text,
      });

      for (const url of endpoints) {
        const startTime = Date.now();
        try {
          console.warn(`[EVOLUTION] [SEND_ATTEMPT] POST ${url} -> ${num}`);
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(10000), // 10s per candidate
          });

          const elapsed = Date.now() - startTime;
          const rawResponseText = await response.text();
          lastStatus = response.status;

          if (response.ok) {
            let data: any = {};
            try {
              data = JSON.parse(rawResponseText);
            } catch {
              data = { raw: rawResponseText };
            }

            const externalId = data.Info?.ID || data.data?.id || data.key?.id || data.id || data.messageId || data.Info?.id;

            console.warn(`[EVOLUTION] [SEND_SUCCESS] POST ${url} [HTTP ${response.status}] in ${elapsed}ms | Number: ${num} | Msg ID: ${externalId || 'N/A'}`);

            if (organizationId) {
              await NotificationService.saveOutgoingMessage({
                phone: num,
                content: text,
                organizationId,
                status: 'SENT',
                externalId: String(externalId || ''),
                memberId,
              }).catch(e => console.error('[EVOLUTION_LOG_ERROR]', e));
            }

            return {
              sent: true,
              externalId: externalId ? String(externalId) : undefined,
              data,
              endpoint: url,
              status: response.status,
              latencyMs: elapsed,
            };
          }

          // Se for erro de dispositivo não encontrado no WhatsApp (whatsmeow JID)
          if (rawResponseText.includes('device JID') || rawResponseText.includes('doesn\'t contain a device')) {
            lastError = `Número ${num} não possui conta ou dispositivo ativo no WhatsApp (device JID not found)`;
            console.warn(`[EVOLUTION] [SEND_WARN] POST ${url} [HTTP ${response.status}] in ${elapsed}ms -> Number: ${num} -> WhatsApp account not found on device store.`);
            break; // Pula para o próximo candidate sem tentar rotas inexistentes
          }

          lastError = `Endpoint ${url} retornou HTTP ${response.status} (${response.statusText}): ${rawResponseText.slice(0, 200)}`;
          console.warn(`[EVOLUTION] [SEND_WARN] POST ${url} [HTTP ${response.status}] in ${elapsed}ms -> Number: ${num} -> Response: ${rawResponseText.slice(0, 300)}`);
        } catch (error) {
          const elapsed = Date.now() - startTime;
          const errMsg = error instanceof Error ? error.message : String(error);
          lastError = `Erro ao chamar ${url} para ${num}: ${errMsg}`;
          console.error(`[EVOLUTION] [SEND_FAIL] POST ${url} (number ${num}) failed after ${elapsed}ms: ${errMsg}`);
        }
      }
    }

    console.error(`[EVOLUTION] [SEND_EXHAUSTED] All candidates failed for ${to}. Reason: ${lastError}`);

    if (organizationId) {
      await NotificationService.saveOutgoingMessage({
        phone: phoneCandidates[0] || to,
        content: text,
        organizationId,
        status: 'FAILED',
        memberId,
      }).catch(e => console.error('[EVOLUTION_LOG_ERROR]', e));
    }

    return {
      sent: false,
      error: lastError,
      status: lastStatus,
    };
  }

  /**
   * Fetches all instances to monitor status.
   */
  public async fetchInstances(): Promise<EvolutionGoInstance[]> {
    if (!this.apiKey) {
      return [];
    }
    const url = `${this.baseUrl}/instance/fetchInstances`;
    const headers: Record<string, string> = { apikey: this.apiKey };
    if (this.instanceName) {
      headers.instance = this.instanceName;
    }

    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        console.warn(`[EVOLUTION] [FETCH_INSTANCES_WARN] ${url} returned ${response.status}`);
        return [];
      }
      return (await response.json()) as EvolutionGoInstance[];
    } catch (error) {
      console.error('[EVOLUTION] [FETCH_INSTANCES_ERROR]', error);
      return [];
    }
  }

  /**
   * Fetches the connection status of the current instance.
   */
  public async getInstanceStatus(): Promise<InstanceStatusResult> {
    if (!this.apiKey || !this.instanceName) {
      return { connected: false, error: 'Config missing: API Key or Instance name not set' };
    }

    const endpoints = [
      `${this.baseUrl}/instance/status`,
      `${this.baseUrl}/instance/connectionState/${this.instanceName}`,
      `${this.baseUrl}/instance/status/${this.instanceName}`,
    ];

    const headers: Record<string, string> = {
      apikey: this.apiKey,
      instance: this.instanceName,
      instanceName: this.instanceName,
    };

    let lastError = '';

    for (const url of endpoints) {
      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });

        const elapsed = Date.now() - startTime;
        if (!response.ok) {
          lastError = `Status endpoint ${url} retornou ${response.status}`;
          continue;
        }

        const result = await response.json();
        const rawData = result.data || result.instance || result;
        const rawConnected = rawData.Connected ?? rawData.connected;
        const rawLoggedIn = rawData.LoggedIn ?? rawData.loggedIn;
        const state = (rawData.state || rawData.status || '').toLowerCase();
        const disconnectReason = rawData.disconnect_reason || result.disconnect_reason;

        let connected = false;
        if (typeof rawConnected === 'boolean') {
          connected = rawConnected;
        } else if (state === 'open') {
          connected = true;
        }

        let loggedIn = false;
        if (typeof rawLoggedIn === 'boolean') {
          loggedIn = rawLoggedIn;
        } else if (state === 'open') {
          loggedIn = true;
        }

        // Se o estado for explicitamente fechado ou desconectado
        if (['close', 'closed', 'disconnected', 'logout', 'loggedout'].includes(state)) {
          connected = false;
          loggedIn = false;
        }

        const name = rawData.Name || rawData.name || this.instanceName;

        console.warn(`[EVOLUTION] [STATUS_OK] Checked ${url} in ${elapsed}ms -> Connected: ${connected}, LoggedIn: ${loggedIn}, State: ${state || 'N/A'}, Name: ${name}`);

        return {
          connected,
          loggedIn,
          name,
          state,
          disconnectReason,
          latencyMs: elapsed,
        };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        lastError = errMsg;
      }
    }

    console.warn(`[EVOLUTION] [STATUS_WARN] Failed to get instance status: ${lastError}`);
    return { connected: false, error: lastError };
  }

  /**
   * Gets the QR Code for the current instance.
   */
  public async getQRCode(): Promise<{ success?: boolean; data?: string; error?: string }> {
    if (!this.apiKey || !this.instanceName) {
      return { error: 'Config missing' };
    }

    const endpoints = [
      `${this.baseUrl}/instance/qr`,
      `${this.baseUrl}/instance/connect/${this.instanceName}`,
      `${this.baseUrl}/instance/connect`,
    ];

    const headers: Record<string, string> = {
      apikey: this.apiKey,
      instance: this.instanceName,
      instanceName: this.instanceName,
    };

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          continue;
        }

        const result = await response.json();
        const qr = typeof result.data === 'string'
          ? result.data
          : (result.data?.qrcode || result.base64 || result.qrcode?.base64 || result.code || null);

        if (qr) {
          console.warn(`[EVOLUTION] [QR_SUCCESS] QR Code retrieved successfully from ${url}`);
          return { success: true, data: qr };
        }
      } catch (error) {
        console.warn(`[EVOLUTION] [QR_ATTEMPT_FAIL] ${url}:`, error instanceof Error ? error.message : error);
      }
    }

    return { error: 'QR não disponível ainda' };
  }

  /**
   * Connects to the instance.
   * @param phone - Número de telefone opcional para iniciar conexão.
   * @param webhookUrl - URL do webhook para inscrição nos eventos.
   * @returns Resultado da tentativa de conexão com QR Code ou mensagem.
   */
  public async connectInstance(phone?: string, webhookUrl?: string) {
    if (!this.apiKey || !this.instanceName) {
      return { error: 'Config missing' };
    }

    const endpoints = [
      `${this.baseUrl}/instance/connect`,
      `${this.baseUrl}/instance/connect/${this.instanceName}`,
    ];

    const body = JSON.stringify({
      immediate: true,
      phone: phone || '',
      webhookUrl: webhookUrl || '',
      subscribe: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    });

    for (const url of endpoints) {
      try {
        console.warn(`[EVOLUTION] [CONNECT_ATTEMPT] POST ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'instance': this.instanceName,
            'instanceName': this.instanceName,
          },
          body,
          signal: AbortSignal.timeout(12000),
        });

        const result = await response.json();
        const qr = typeof result.data === 'string'
          ? result.data
          : (result.data?.qrcode || result.base64 || result.qrcode?.base64 || null);

        console.warn(`[EVOLUTION] [CONNECT_RESULT] ${url} [HTTP ${response.status}] -> HasQR: ${Boolean(qr)}`);

        return {
          success: response.ok,
          data: qr,
          message: result.message,
        };
      } catch (error) {
        console.warn(`[EVOLUTION] [CONNECT_ERROR] ${url}:`, error instanceof Error ? error.message : error);
      }
    }

    return { error: 'Falha ao conectar instância' };
  }

  /**
   * Requests a pairing code for the instance.
   * @param phone - Número de telefone para solicitar o código de pareamento.
   * @returns Código de pareamento numérico gerado.
   */
  public async pairInstance(phone: string) {
    if (!this.apiKey || !this.instanceName) {
      return { error: 'Config missing' };
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const endpoints = [
      `${this.baseUrl}/instance/pair`,
      `${this.baseUrl}/instance/pair/${this.instanceName}`,
      `${this.baseUrl}/instance/pairingCode/${this.instanceName}`,
    ];

    const body = JSON.stringify({
      phone: cleanPhone,
      subscribe: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    });

    for (const url of endpoints) {
      try {
        console.warn(`[EVOLUTION] [PAIR_ATTEMPT] POST ${url} for ${cleanPhone}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'instance': this.instanceName,
            'instanceName': this.instanceName,
          },
          body,
          signal: AbortSignal.timeout(12000),
        });

        const result = await response.json();
        let code = result.data;
        if (typeof code === 'object' && code !== null) {
          code = code.PairingCode || code.code || code.pairingCode || JSON.stringify(code);
        }

        if (response.ok && code) {
          console.warn(`[EVOLUTION] [PAIR_SUCCESS] Pairing code generated: ${code}`);
          return {
            success: true,
            code: String(code),
          };
        }
      } catch (error) {
        console.warn(`[EVOLUTION] [PAIR_ERROR] ${url}:`, error instanceof Error ? error.message : error);
      }
    }

    return { error: 'Falha ao solicitar código de pareamento' };
  }

  /**
   * Configures the webhook for the current instance.
   * @param webhookUrl - URL pública do endpoint para recebimento de eventos.
   * @returns Resultado da configuração do webhook.
   */
  public async setWebhook(webhookUrl: string) {
    if (!this.apiKey || !this.instanceName) {
      return { success: false, error: 'Instance or API Key not configured' };
    }

    const endpoints = [
      `${this.baseUrl}/webhook/set`,
      `${this.baseUrl}/instance/webhook`,
      `${this.baseUrl}/webhook/instance`,
      `${this.baseUrl}/webhook/set/${this.instanceName}`,
    ];

    const body = {
      instance: this.instanceName,
      url: webhookUrl,
      enabled: true,
      webhook_by_events: false,
      events: [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
      ],
    };

    let lastError = '';

    for (const url of endpoints) {
      try {
        console.warn(`[EVOLUTION] [WEBHOOK_SYNC_ATTEMPT] POST ${url} -> URL: ${webhookUrl}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'instance': this.instanceName,
            'instanceName': this.instanceName,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });

        const rawText = await response.text();
        console.warn(`[EVOLUTION] [WEBHOOK_SYNC_RESULT] ${url} [HTTP ${response.status}] -> ${rawText}`);

        if (response.ok) {
          return { success: true, data: rawText };
        }
        lastError = `URL ${url} retornou HTTP ${response.status}: ${rawText}`;
      } catch (error) {
        console.error(`[EVOLUTION] [WEBHOOK_SYNC_ERROR] ${url}:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return { success: false, error: `Falha na sincronização: ${lastError}` };
  }

  /**
   * Diagnoses Evolution API server reachability and latency.
   */
  public async pingHealth(): Promise<{ reachable: boolean; latencyMs: number; status?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(6000),
      });
      const latencyMs = Date.now() - startTime;
      return { reachable: true, latencyMs, status: response.status };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        reachable: false,
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
