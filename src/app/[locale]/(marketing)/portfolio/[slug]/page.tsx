import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/libs/I18nRouting';
import { getI18nMetadata } from '@/utils/I18nMetadata';

type PortfolioDetailPageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export function generateStaticParams() {
  return routing.locales
    .map(locale =>
      Array.from({ length: 6 }, (_, i) => ({
        slug: `${i}`,
        locale,
      })),
    )
    .flat(1);
}

export async function generateMetadata(props: PortfolioDetailPageProps): Promise<Metadata> {
  return getI18nMetadata('PortfolioSlug', props.params);
}

export default async function PortfolioDetail(props: PortfolioDetailPageProps) {
  const { locale, slug } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'PortfolioSlug',
  });

  return (
    <>
      <h1 className="capitalize">{t('header', { slug })}</h1>
      <p>{t('content')}</p>
    </>
  );
};

export const dynamicParams = false;
