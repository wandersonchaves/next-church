import * as Sentry from '@sentry/nextjs';

const sentryOptions: Sentry.NodeOptions | Sentry.EdgeOptions = {
  // Sentry DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Enable Spotlight in development
  spotlight: process.env.NODE_ENV === 'development',

  integrations: [
    Sentry.consoleLoggingIntegration(),
  ],

  // Adds request headers and IP for users, for more info visit
  sendDefaultPii: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // Node.js Sentry configuration
      Sentry.init(sentryOptions);
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge Sentry configuration
      Sentry.init(sentryOptions);
    }
  }

  // Monitoramento de Conexão WhatsApp no Boot (Deploy)
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    try {
      const { inngest } = await import('@/libs/Inngest');
      await inngest.send({
        name: 'system/connection.check',
        data: {
          reason: 'deployment_boot',
          timestamp: new Date().toISOString(),
        },
      });
      console.warn('🚀 [BOOT] Verificação de conexão WhatsApp disparada com sucesso.');
    } catch (error) {
      console.error('❌ [BOOT_ERROR] Falha ao disparar verificação de conexão:', error);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
