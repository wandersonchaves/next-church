import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getI18nMetadata } from '@/utils/I18nMetadata';

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: AboutPageProps): Promise<Metadata> {
  return getI18nMetadata('About', props.params);
}

export default async function About(props: AboutPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Usamos getTranslations para Server Components (assíncrono)
  const t = await getTranslations({ locale, namespace: 'About' });

  return (
    <div className="space-y-6 py-8">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sobre o Philadelphia Hub</h2>
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-lg leading-relaxed text-slate-700 italic shadow-sm">
        "
        {t('about_paragraph')}
        "
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-slate-900 p-5 text-white shadow-lg">
          <p className="mb-2 font-bold text-blue-400">Visão G12</p>
          <p className="text-sm text-slate-300">Formar discípulos que multiplicam líderes de influência na terra.</p>
        </div>
        <div className="rounded-xl bg-blue-600 p-5 text-white shadow-lg">
          <p className="mb-2 font-bold text-blue-100">Conectar Pessoas</p>
          <p className="text-sm text-blue-50">Garantir que cada membro tenha acompanhamento individual e suporte pastoral.</p>
        </div>
      </div>
    </div>
  );
};
