import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getI18nMetadata } from '@/utils/I18nMetadata';
import { Quote, Crown, Users } from 'lucide-react';
import { AppConfig } from '@/utils/AppConfig';

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
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-24">

      {/* MISSION SECTION - Centralized with specialized typography */}
      <section className="text-center space-y-10 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-blue-50 opacity-50 -z-10">
          <Quote size={120} fill="currentColor" />
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Nossa Missão</h2>
          <blockquote className="text-3xl md:text-5xl font-black leading-tight text-slate-900 italic tracking-tighter">
            "{t('about_paragraph')}"
          </blockquote>
          <div className="flex flex-col items-center gap-3 pt-6">
            <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl shadow-slate-200 uppercase">
              NC
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 uppercase tracking-tighter">Wanderson Chaves</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Idealizador, {AppConfig.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* VISION CARDS - Equal height & Responsive grid */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fundamentos do Projeto</h3>
          <p className="text-slate-500 font-medium">Equilibrando o poder da tecnologia com o toque pessoal do pastoreio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="flex-1 group bg-slate-900 p-12 rounded-[3rem] shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.02] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-600/30">
                <Crown size={24} />
              </div>
              <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-6 italic">Governo G12</h4>
              <p className="text-slate-400 font-medium leading-relaxed text-lg">
                Implementamos a estrutura de linhagem DFS (Depth-First Search) para que o crescimento da sua igreja seja visível, organizado e totalmente rastreável.
              </p>
            </div>
            <div className="mt-10 border-t border-slate-800 pt-6">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Escalabilidade Garantida</span>
            </div>
          </div>

          <div className="flex-1 group bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 transition-all hover:scale-[1.02] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-md">
                <Users size={24} />
              </div>
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 italic">Cuidado Individual</h4>
              <p className="text-slate-500 font-medium leading-relaxed text-lg">
                Nossa tecnologia não substitui o pastor; ela o capacita. Automatizamos a burocracia para que a liderança tenha mais tempo para orar e aconselhar.
              </p>
            </div>
            <div className="mt-10 border-t border-slate-50 pt-6">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Foco em Vidas</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
