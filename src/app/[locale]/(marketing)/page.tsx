import { Shield, Zap, Users, MessageCircle, BarChart3, Globe, ArrowRight } from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import { setRequestLocale } from 'next-intl/server';

export default async function IndexPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale as any);

  const features = [
    {
      title: "Mapeamento de Linhagem",
      description: "Visualize sua rede G12 completa em tempo real. Identifique líderes e frentes de crescimento com clareza absoluta.",
      icon: <Users className="text-blue-600" size={28} />,
    },
    {
      title: "Comunicação Inteligente",
      description: "Integração nativa com WhatsApp para mensagens de aniversário, boas-vindas e acompanhamento automático.",
      icon: <MessageCircle className="text-emerald-600" size={28} />,
    },
    {
      title: "Performance Enterprise",
      description: "Infraestrutura resiliente que garante que os dados da sua igreja estejam sempre seguros e disponíveis 24/7.",
      icon: <Zap className="text-amber-500" size={28} />,
    },
    {
      title: "BI Eclesiástico",
      description: "Estatísticas avançadas sobre conversões e batismos para decisões baseadas em dados reais da sua congregação.",
      icon: <BarChart3 className="text-orange-600" size={28} />,
    },
    {
      title: "Gestão Ministerial",
      description: "Organize voluntários e gerencie ministérios como Louvor, Mídia e Kids Hub em um ambiente unificado.",
      icon: <Globe className="text-purple-600" size={28} />,
    },
    {
      title: "Isolamento de Dados",
      description: "Arquitetura multi-organização que garante privacidade total e segurança para cada congregação.",
      icon: <Shield className="text-slate-900" size={28} />,
    }
  ];

  return (
    <div className="space-y-24 pb-20">

      {/* HERO SECTION */}
      <section className="text-center space-y-8 pt-10 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-fade-in">
          <Shield size={12} /> Visão G12 de Alta Performance
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter max-w-4xl mx-auto italic">
          Gerencie sua Igreja com <br />
          <span className="text-blue-600 not-italic">Precisão Estratégica.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          A plataforma definitiva para lideranças que buscam consolidar a visão e automatizar o cuidado com as vidas.
        </p>
        <div className="pt-4">
          <Link href="/sign-up" className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-2xl hover:scale-105 active:scale-95 inline-flex items-center gap-3">
            Começar Agora Grátis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FEATURES GRID - Clean SaaS Style */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:border-blue-500/20 transition-all group">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{f.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA - Full Width Section */}
      <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-slate-900 py-32 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -ml-48 -mb-48" />

        <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
          <h2 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
            Pronto para transformar sua <br className="hidden lg:block" /> gestão eclesiástica?
          </h2>
          <p className="text-slate-400 text-lg lg:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Junte-se a dezenas de líderes que já automatizaram seus processos para focar no que realmente importa: as vidas.
          </p>
          <div className="pt-6">
            <Link href="/sign-up" className="inline-flex items-center gap-3 px-12 py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-blue-500 transition-all shadow-2xl hover:scale-105 active:scale-95">
              Criar conta gratuita <ArrowRight size={20} />
            </Link>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-8">Implementação em menos de 5 minutos</p>
          </div>
        </div>
      </section>

    </div>
  );
}
