import { ArrowRight, BarChart3, Globe, MessageCircle, Shield, Users, Zap } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

export default async function IndexPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale as any);

  const features = [
    {
      title: 'Mapeamento de Linhagem',
      description: 'Visualize sua rede G12 completa em tempo real. Identifique líderes e frentes de crescimento com clareza absoluta.',
      icon: <Users className="text-blue-600" size={28} />,
    },
    {
      title: 'Comunicação Inteligente',
      description: 'Integração nativa com WhatsApp para mensagens de aniversário, boas-vindas e acompanhamento automático.',
      icon: <MessageCircle className="text-emerald-600" size={28} />,
    },
    {
      title: 'Performance Enterprise',
      description: 'Infraestrutura resiliente que garante que os dados da sua igreja estejam sempre seguros e disponíveis 24/7.',
      icon: <Zap className="text-amber-500" size={28} />,
    },
    {
      title: 'BI Eclesiástico',
      description: 'Estatísticas avançadas sobre conversões e batismos para decisões baseadas em dados reais da sua congregação.',
      icon: <BarChart3 className="text-orange-600" size={28} />,
    },
    {
      title: 'Gestão Ministerial',
      description: 'Organize voluntários e gerencie ministérios como Louvor, Mídia e Kids Hub em um ambiente unificado.',
      icon: <Globe className="text-purple-600" size={28} />,
    },
    {
      title: 'Isolamento de Dados',
      description: 'Arquitetura multi-organização que garante privacidade total e segurança para cada congregação.',
      icon: <Shield className="text-slate-900" size={28} />,
    },
  ];

  return (
    <div className="space-y-24 pb-20">

      {/* HERO SECTION */}
      <section className="space-y-8 px-6 pt-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
          <Shield size={12} />
          {' '}
          Visão G12 de Alta Performance
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl leading-[1.1] font-black tracking-tighter text-slate-900 italic lg:text-7xl">
          Gerencie sua Igreja com
          {' '}
          <br />
          <span className="text-blue-600 not-italic">Precisão Estratégica.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed font-medium text-slate-500">
          A plataforma definitiva para lideranças que buscam consolidar a visão e automatizar o cuidado com as vidas.
        </p>
        <div className="pt-4">
          <Link href="/sign-up" className="inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-12 py-6 text-xs font-black tracking-widest text-white uppercase shadow-2xl transition-all hover:scale-105 hover:bg-blue-600 active:scale-95">
            Começar Agora Grátis
            {' '}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FEATURES GRID - Clean SaaS Style */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="group rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-xl shadow-slate-200/20 transition-all hover:border-blue-500/20">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 transition-transform group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="mb-4 text-xl font-black tracking-tight text-slate-900 uppercase">{f.title}</h3>
              <p className="text-sm leading-relaxed font-medium text-slate-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA - Full Width Section */}
      <section className="relative right-1/2 left-1/2 mr-[-50vw] ml-[-50vw] w-screen overflow-hidden bg-slate-900 px-6 py-32">
        <div className="absolute top-0 right-0 -mt-48 -mr-48 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -mb-48 -ml-48 h-96 w-96 rounded-full bg-indigo-600/20 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-10 text-center">
          <h2 className="text-4xl leading-none font-black tracking-tighter text-white uppercase italic lg:text-6xl">
            Pronto para transformar sua
            {' '}
            <br className="hidden lg:block" />
            {' '}
            gestão eclesiástica?
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed font-medium text-slate-400 lg:text-xl">
            Junte-se a dezenas de líderes que já automatizaram seus processos para focar no que realmente importa: as vidas.
          </p>
          <div className="pt-6">
            <Link href="/sign-up" className="inline-flex items-center gap-3 rounded-4xl bg-blue-600 px-12 py-6 text-sm font-black tracking-widest text-white uppercase shadow-2xl transition-all hover:scale-105 hover:bg-blue-500 active:scale-95">
              Criar conta gratuita
              {' '}
              <ArrowRight size={20} />
            </Link>
            <p className="mt-8 text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Implementação em menos de 5 minutos</p>
          </div>
        </div>
      </section>

    </div>
  );
}
