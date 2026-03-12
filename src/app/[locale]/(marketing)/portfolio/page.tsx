import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getI18nMetadata } from '@/utils/I18nMetadata';

type PortfolioPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: PortfolioPageProps): Promise<Metadata> {
  return getI18nMetadata('Portfolio', props.params);
}

export default async function Portfolio(props: PortfolioPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Usamos getTranslations para Server Components (assíncrono)
  const t = await getTranslations({ locale, namespace: 'Portfolio' });

  return (
    <div className="space-y-8 py-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Redes de Discipulado</h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{t('presentation')}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Link
            key={i}
            href={`/portfolio/${i}`}
            className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-2">
              <span className="text-2xl">🌍</span>
              <p className="text-lg font-bold text-slate-800 transition-colors group-hover:text-blue-600">
                {t('portfolio_name', { name: i })}
              </p>
              <p className="text-xs font-medium tracking-widest text-slate-400 uppercase italic">Ver Detalhes</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
