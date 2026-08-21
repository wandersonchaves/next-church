import { setRequestLocale } from 'next-intl/server';
import { LiteracyRegistrationForm } from '@/components/Literacy/LiteracyRegistrationForm';
import { BookOpen, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { AppConfig } from '@/utils/AppConfig';

export const dynamic = 'force-dynamic';

export default async function LiteracyPublicPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* CABEÇALHO HERO */}
      <div className="mx-auto max-w-3xl text-center mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest border border-blue-100 shadow-xs">
          <GraduationCap size={16} />
          {AppConfig.name} • Ação Social & Alfabetização
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Inscrição para as <span className="text-blue-600">Turmas de Alfabetização</span>
        </h1>

        <p className="text-base text-slate-600 max-w-xl mx-auto font-medium">
          Aprender a ler e escrever transforma vidas. Cadastre os novos participantes para montarmos as turmas na nossa comunidade.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-indigo-700 font-black">
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
      <footer className="mt-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest pb-6">
        &copy; {new Date().getFullYear()} {AppConfig.name} • Gestão Comunitária & Alfabetização
      </footer>
    </div>
  );
}
