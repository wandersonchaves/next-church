import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/libs/Env';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  output: 'standalone',
  devIndicators: {
    position: 'bottom-right',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  generateBuildId: async () => {
    // Retorna o hash do commit se disponível (Railway expõe RAILWAY_GIT_COMMIT_SHA)
    // Caso contrário, usa um timestamp para garantir unicidade
    return process.env.RAILWAY_GIT_COMMIT_SHA || `build-${Date.now()}`;
  },
  reactCompiler: process.env.NODE_ENV === 'production',
  outputFileTracingIncludes: {
    '/': ['./migrations/**/*'],
  },
};

// Initialize the Next-Intl plugin
let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

// Conditionally enable bundle analysis with dynamic require for safety
if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')();
    configWithPlugins = withBundleAnalyzer(configWithPlugins);
  } catch (e) {
    console.warn("Bundle analyzer not found, skipping analysis.");
  }
}

// Conditionally enable Sentry configuration
if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    org: process.env.SENTRY_ORGANIZATION,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    webpack: {
      reactComponentAnnotation: {
        enabled: true,
      },
      treeshake: {
        removeDebugLogging: true,
      },
    },
    telemetry: false,
  });
}

const nextConfig = configWithPlugins;
export default nextConfig;
