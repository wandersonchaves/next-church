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
    this.baseUrl = (Env.EVOLUTION_BASE_URL || 'https://evolution-go-prd.up.railway.app').replace(/\/$/, '');
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
   * @param to - Recipient number (JID or number with prefix).
   * @param text - Message content.
   * @param organizationId - Context for logging (optional).
   */
  public async sendMessage(to: string, text: string, organizationId?: string) {
    if (!this.apiKey) {
      console.warn('[EVOLUTION_GO] Warning: EVOLUTION_API_KEY not configured.');
      return { sent: false, reason: 'CONFIG_MISSING' };
    }

    // Normalization: Ensure 55 prefix for Brazil numbers (keeping the 9th digit if present)
    let cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`;
    }

    const url = `${this.baseUrl}/send/text`;

    // Strict header matching with the working CURL
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey, 
    };

    // Only send instance if it's explicitly configured and not empty
    if (this.instanceName && this.instanceName !== '') {
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

    let rawResponseText = '';
    try {
      const response = await fetch(url, options);
      rawResponseText = await response.text();

      if (!response.ok) {
        console.error(`[EVOLUTION_GO_ERROR] HTTP ${response.status} - Body:`, rawResponseText);
        throw new Error(`HTTP Error ${response.status}: ${rawResponseText.slice(0, 100)}`);
      }

      let data: any;
      try {
        data = JSON.parse(rawResponseText);
      } catch (e) {
        console.error('[EVOLUTION_GO_PARSE_ERROR] Failed to parse response as JSON. Raw response:', rawResponseText);
        throw new Error(`Invalid JSON response from API: ${rawResponseText.slice(0, 100)}`);
      }

      // Log success asynchronously
      if (organizationId) {
        NotificationService.saveOutgoingMessage({
          phone: cleanNumber,
          content: text,
          organizationId,
          status: 'SENT',
        }).catch(e => console.error('[EVOLUTION_GO_LOG_ERROR]', e));
      }

      return { sent: true, data };
    } catch (error) {
      console.error('[EVOLUTION_GO_SEND_ERROR]', error);

      // Log failure asynchronously
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

    const headers: Record<string, string> = {
      'apiKey': this.apiKey,
    };

    if (this.instanceName) {
      headers.instance = this.instanceName;
    }

    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      return await response.json() as EvolutionGoInstance[];
    } catch (error) {
      console.error('[EVOLUTION_GO_FETCH_ERROR]', error);
      return [];
    }
  }
}
