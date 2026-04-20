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
  public async sendMessage(to: string, text: string, organizationId?: string) {
    if (!this.apiKey) {
      console.warn('[EVOLUTION_GO] Warning: EVOLUTION_API_KEY not configured.');
      return { sent: false, reason: 'CONFIG_MISSING' };
    }

    let cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`;
    }

    const url = `${this.baseUrl}/send/text`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey, 
    };

    if (this.instanceName) {
      headers.instance = this.instanceName;
    }

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: cleanNumber,
        text: text,
      }),
      signal: AbortSignal.timeout(15000),
    };

    try {
      const response = await fetch(url, options);
      const rawResponseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${rawResponseText.slice(0, 100)}`);
      }

      const data = JSON.parse(rawResponseText);
      
      // Evolution GO v2 costuma retornar Info.ID ou data.id
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
    } catch (error) {
      console.error('[EVOLUTION_GO_SEND_ERROR]', error);
      if (organizationId) {
        NotificationService.saveOutgoingMessage({
          phone: cleanNumber,
          content: text,
          organizationId,
          status: 'FAILED',
        }).catch(e => console.error('[EVOLUTION_GO_LOG_ERROR]', e));
      }
      return { sent: false, error: String(error) };
    }
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
