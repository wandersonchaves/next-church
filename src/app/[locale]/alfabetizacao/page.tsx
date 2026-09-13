import { BookOpen, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { LiteracyRegistrationForm } from '@/components/Literacy/LiteracyRegistrationForm';
import { AppConfig } from '@/utils/AppConfig';

export const dynamic = 'force-dynamic';

export default async function LiteracyPublicPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* CABEÇALHO HERO */}
      <div className="mx-auto mb-8 max-w-3xl space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-black tracking-widest text-blue-700 uppercase shadow-xs">
          <GraduationCap size={16} />
          {AppConfig.name}
          {' '}
          • Ação Social & Alfabetização
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Inscrição para as
          {' '}
          <span className="text-blue-600">Turmas de Alfabetização</span>
        </h1>

        <p className="mx-auto max-w-xl text-base font-medium text-slate-600">
          Aprender a ler e escrever transforma vidas. Cadastre os novos participantes para montarmos as turmas na nossa comunidade.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
          <span className="flex items-center gap-1.5 font-black text-indigo-700">
            <span>🌙</span>
            Aulas no Período Noturno
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            100% Gratuito
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} className="text-blue-600" />
            Material Incluso
          </span>
          <span className="flex items-center gap-1.5">
            <Heart size={14} className="text-rose-500" />
            Acolhimento da Igreja
          </span>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO ACESSÍVEL */}
      <LiteracyRegistrationForm isPublic={true} />

      {/* RODAPÉ */}
      <footer className="mt-12 pb-6 text-center text-xs font-bold tracking-widest text-slate-400 uppercase">
        &copy;
        {' '}
        {new Date().getFullYear()}
        {' '}
        {AppConfig.name}
        {' '}
        • Gestão Comunitária & Alfabetização
      </footer>
    </div>
  );
}
