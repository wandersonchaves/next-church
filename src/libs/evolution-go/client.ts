import { Env } from '@/libs/Env';
import { NotificationService } from '@/libs/services/NotificationService';

export interface EvolutionGoInstance {
  instanceName: string;
  status: string;
}

export class EvolutionGoClient {
  private static instance: EvolutionGoClient;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  private constructor() {
    this.baseUrl = (Env.EVOLUTION_BASE_URL || 'https://evolution-go.up.railway.app').replace(/\/$/, '');
    this.apiKey = Env.EVOLUTION_API_KEY?.replace(/['"]/g, '').trim();
    this.instanceName = (Env.EVOLUTION_INSTANCE || '').replace(/['"]/g, '').trim();
  }

  public static getInstance(): EvolutionGoClient {
    if (!EvolutionGoClient.instance) {
      EvolutionGoClient.instance = new EvolutionGoClient();
    }
    return EvolutionGoClient.instance;
  }

  /**
   * Sends a text message via Evolution GO v2.
   */
  public async sendMessage(
    to: string,
    text: string,
    organizationId?: string,
    overrides?: { instanceName?: string; apiKey?: string }
  ) {
    const apiKey = overrides?.apiKey || this.apiKey;
    const instanceName = overrides?.instanceName || this.instanceName;

    if (!apiKey) {
      console.warn('[EVOLUTION_GO] Warning: API Key not configured.');
      return { sent: false, reason: 'CONFIG_MISSING' };
    }

    let cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`;
    }

    // Evolution API v2 (Node) uses /message/sendText
    // Evolution GO v2 uses /send/text
    const endpoints = [
      `${this.baseUrl}/message/sendText`,
      `${this.baseUrl}/send/text`
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    };

    if (instanceName) {
      headers.instance = instanceName;
    }

    const body = JSON.stringify({
      number: cleanNumber,
      text: text,
    });

    let lastError = '';

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        const rawResponseText = await response.text();

        if (response.ok) {
          const data = JSON.parse(rawResponseText);
          const externalId = data.Info?.ID || data.data?.id || data.key?.id;

          if (organizationId) {
            NotificationService.saveOutgoingMessage({
              phone: cleanNumber,
              content: text,
              organizationId,
              status: 'SENT',
              externalId: String(externalId || ''),
            }).catch(e => console.error('[EVOLUTION_GO_LOG_ERROR]', e));
          }

          return { sent: true, data };
        }

        lastError = `Endpoint ${url} retornou ${response.status}`;
      } catch (error) {
        lastError = String(error);
        console.warn(`[EVOLUTION_GO_RETRY] Failed ${url}:`, error);
      }
    }

    if (organizationId) {
      NotificationService.saveOutgoingMessage({
        phone: cleanNumber,
        content: text,
        organizationId,
        status: 'FAILED',
      }).catch(e => console.error('[EVOLUTION_GO_LOG_ERROR]', e));
    }

    return { sent: false, error: lastError };
  }

  /**
   * Fetches all instances to monitor status.
   */
  public async fetchInstances(): Promise<EvolutionGoInstance[]> {
    if (!this.apiKey) return [];
    const url = `${this.baseUrl}/instance/fetchInstances`;
    const headers: Record<string, string> = { 'apiKey': this.apiKey };
    if (this.instanceName) { headers.instance = this.instanceName; }

    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      if (!response.ok) return [];
      return await response.json() as EvolutionGoInstance[];
    } catch (error) {
      console.error('[EVOLUTION_GO_FETCH_ERROR]', error);
      return [];
    }
  }

  /**
   * Fetches the connection status of the current instance.
   */
  public async getInstanceStatus() {
    if (!this.apiKey || !this.instanceName) {
      return { connected: false, error: 'Config missing' };
    }

    const url = `${this.baseUrl}/instance/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'instance': this.instanceName
        },
        next: { revalidate: 30 } // Cache de 30 segundos
      });

      if (!response.ok) return { connected: false };

      const result = await response.json();
      return {
        connected: result.data?.Connected === true,
        loggedIn: result.data?.LoggedIn === true,
        name: result.data?.Name,
      };
    } catch (error) {
      console.error('[EVOLUTION_GO_STATUS_ERROR]', error);
      return { connected: false, error: String(error) };
    }
  }

  /**
   * Gets the QR Code for the current instance.
   */
  public async getQRCode() {
    if (!this.apiKey || !this.instanceName) return { error: 'Config missing' };
    
    const url = `${this.baseUrl}/instance/qr`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'instance': this.instanceName
        },
        cache: 'no-store'
      });

      if (!response.ok) return { error: `HTTP Error ${response.status}` };
      
      const result = await response.json();
      return { success: true, data: result.data }; // Base64 ou string do QR
    } catch (error) {
      return { error: String(error) };
    }
  }

  /**
   * Connects to the instance.
   */
  public async connectInstance(phone?: string, webhookUrl?: string) {
    if (!this.apiKey || !this.instanceName) return { error: 'Config missing' };

    const url = `${this.baseUrl}/instance/connect`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'instance': this.instanceName
        },
        body: JSON.stringify({
          immediate: true,
          phone: phone || "",
          webhookUrl: webhookUrl || "",
          subscribe: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        }),
      });

      const result = await response.json();
      return { success: response.ok, data: result };
    } catch (error) {
      return { error: String(error) };
    }
  }

  /**
   * Requests a pairing code for the instance.
   */
  public async pairInstance(phone: string) {
    if (!this.apiKey || !this.instanceName) return { error: 'Config missing' };

    const url = `${this.baseUrl}/instance/pair`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'instance': this.instanceName
        },
        body: JSON.stringify({
          phone,
          subscribe: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        }),
      });

      const result = await response.json();
      return { success: response.ok, data: result };
    } catch (error) {
      return { error: String(error) };
    }
  }

  /**
   * Configures the webhook for the current instance.
   * Optimized for Evolution GO (Golang) v2 based on official docs.
   */
  public async setWebhook(webhookUrl: string) {
    if (!this.apiKey || !this.instanceName) {
      return { success: false, error: 'Instance or API Key not configured' };
    }

    // Tentamos os endpoints mais prováveis para Evolution GO v2
    const endpoints = [
      `${this.baseUrl}/webhook/set`,
      `${this.baseUrl}/instance/webhook`,
      `${this.baseUrl}/webhook/instance`
    ];

    const body = {
      instance: this.instanceName, // Algumas versões exigem no corpo
      url: webhookUrl,
      enabled: true,
      webhook_by_events: false,
      events: [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE'
      ]
    };

    let lastError = '';

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'instance': this.instanceName
          },
          body: JSON.stringify(body),
        });

        const rawText = await response.text();
        console.info(`[EVOLUTION_GO_SYNC] Attempting URL: ${url} | Status: ${response.status} | Response: ${rawText}`);

        if (response.ok) {
          return { success: true, data: rawText };
        }
        lastError = `URL ${url} retornou ${response.status}: ${rawText}`;
      } catch (error) {
        console.error(`[EVOLUTION_GO_SYNC_ERROR] Connection failed for ${url}:`, error);
        lastError = String(error);
      }
    }

    return { success: false, error: `Falha na sincronização: ${lastError}` };
  }
}
