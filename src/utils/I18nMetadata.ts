import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AppConfig } from '@/utils/AppConfig';

/**
 * Utilitário centralizado para gerar metadados internacionalizados.
 * Suporta variáveis dinâmicas baseadas nos parâmetros da URL (ex: {slug}).
 * @param namespace - O namespace das traduções.
 * @param params - A promessa dos parâmetros da página.
 */
export async function getI18nMetadata(
  namespace: any,
  params: Promise<any>,
): Promise<Metadata> {
  const resolvedParams = await params;
  const { locale, ...values } = resolvedParams;

  try {
    const t = (await getTranslations({ locale, namespace })) as any;

    // Verificamos a existência das chaves ANTES de acessá-las
    // O método .has() é seguro e não dispara MISSING_MESSAGE
    const hasTitle = t.has('meta_title');
    const hasDescription = t.has('meta_description');

    const title = hasTitle
      ? t('meta_title', values)
      : AppConfig.name;

    const description = hasDescription
      ? t('meta_description', values)
      : undefined;

    return { title, description };
  } catch {
    // Se o namespace inteiro falhar
    console.warn(`[I18nMetadata] Namespace "${namespace}" not found for locale "${locale}".`);

    return {
      title: AppConfig.name,
      description: 'Philadelphia Hub - Gestão G12',
    };
  }
}
