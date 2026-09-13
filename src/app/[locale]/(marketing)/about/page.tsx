import type { Metadata } from 'next';
import { Crown, Quote, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppConfig } from '@/utils/AppConfig';
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

  const t = await getTranslations({ locale, namespace: 'About' });

  return (
    <div className="mx-auto max-w-6xl space-y-24 px-6 py-12">

      {/* MISSION SECTION - Centralized with specialized typography */}
      <section className="relative space-y-10 text-center">
        <div className="absolute -top-10 left-1/2 -z-10 -translate-x-1/2 text-blue-50 opacity-50">
          <Quote size={120} fill="currentColor" />
        </div>

        <div className="mx-auto max-w-4xl space-y-6">
          <h2 className="text-[10px] font-black tracking-[0.4em] text-blue-600 uppercase">Nossa Missão</h2>
          <blockquote className="text-3xl leading-tight font-black tracking-tighter text-slate-900 italic md:text-5xl">
            "
            {t('about_paragraph')}
            "
          </blockquote>
          <div className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white uppercase shadow-xl shadow-slate-200">
              NC
            </div>
            <div className="text-center">
              <p className="font-black tracking-tighter text-slate-900 uppercase">Wanderson Chaves</p>
              <p className="mt-1 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                Idealizador,
                {AppConfig.name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VISION CARDS - Equal height & Responsive grid */}
      <section className="space-y-12">
        <div className="space-y-3 text-center">
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Fundamentos do Projeto</h3>
          <p className="font-medium text-slate-500">Equilibrando o poder da tecnologia com o toque pessoal do pastoreio.</p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          <div className="group flex flex-1 flex-col justify-between rounded-[3rem] bg-slate-900 p-12 shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.02]">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <Crown size={24} />
              </div>
              <h4 className="mb-6 text-2xl font-black tracking-tight text-white uppercase italic">Governo G12</h4>
              <p className="text-lg leading-relaxed font-medium text-slate-400">
                Implementamos a estrutura de linhagem DFS (Depth-First Search) para que o crescimento da sua igreja seja visível, organizado e totalmente rastreável.
              </p>
            </div>
            <div className="mt-10 border-t border-slate-800 pt-6">
              <span className="text-[9px] font-black tracking-widest text-blue-500 uppercase">Escalabilidade Garantida</span>
            </div>
          </div>

          <div className="group flex flex-1 flex-col justify-between rounded-[3rem] border border-slate-100 bg-white p-12 shadow-2xl shadow-slate-200/40 transition-all hover:scale-[1.02]">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-md">
                <Users size={24} />
              </div>
              <h4 className="mb-6 text-2xl font-black tracking-tight text-slate-900 uppercase italic">Cuidado Individual</h4>
              <p className="text-lg leading-relaxed font-medium text-slate-500">
                Nossa tecnologia não substitui o pastor; ela o capacita. Automatizamos a burocracia para que a liderança tenha mais tempo para orar e aconselhar.
              </p>
            </div>
            <div className="mt-10 border-t border-slate-50 pt-6">
              <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase">Foco em Vidas</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
