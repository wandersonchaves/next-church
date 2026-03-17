import { enUS, frFR } from '@clerk/localizations';

export const AppConfig = {
  name: 'NextChurch',
  technicalName: 'next-church',
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed' as const,
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    localePrefix: 'as-needed' as const,
  },
};

/**
 * Configuração de localizações do Clerk compatível com o layout do boilerplate.
 */
export const ClerkLocalizations = {
  supportedLocales: {
    en: enUS,
    fr: frFR,
  },
  defaultLocale: enUS,
};
