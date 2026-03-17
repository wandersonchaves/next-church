import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getI18nMetadata } from '@/utils/I18nMetadata';
import { Users, Heart, Baby, Shield, Flower2, Zap, ArrowRight } from 'lucide-react';

type PortfolioPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: PortfolioPageProps): Promise<Metadata> {
  return getI18nMetadata('Portfolio', props.params);
}

const networks = [
  {
    slug: 'youth',
    icon: <Zap className="text-amber-500" size={24} />,
    name: 'Rede de Jovens',
    description: 'Transformando a nova geração através de liderança e propósito radical.',
  },
  {
    slug: 'couples',
    icon: <Heart className="text-red-500" size={24} />,
    name: 'Rede de Casais',
    description: 'Fortalecendo casamentos e construindo famílias fundamentadas na rocha.',
  },
  {
    slug: 'kids',
    icon: <Baby className="text-blue-500" size={24} />,
    name: 'Rede Kids',
    description: 'Plantando as sementes do Reino no coração das crianças com alegria.',
  },
  {
    slug: 'men',
    icon: <Shield className="text-slate-700" size={24} />,
    name: 'Rede de Homens',
    description: 'Formando homens de integridade, honra e sacerdócio no lar.',
  },
  {
    slug: 'women',
    icon: <Flower2 className="text-pink-500" size={24} />,
    name: 'Rede de Mulheres',
    description: 'Capacitando mulheres para um ministério de influência e frutificação.',
  },
  {
    slug: 'consolidation',
    icon: <Users className="text-emerald-500" size={24} />,
    name: 'Rede de Consolidação',
    description: 'O braço de cuidado que acolhe e integra cada novo decidido à família.',
  },
];

export default async function Portfolio(props: PortfolioPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Portfolio' });

  return (
    <div className="space-y-12 py-12 max-w-6xl mx-auto px-6">
      <header className="text-center md:text-left space-y-4">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Redes de Discipulado</h2>
        <p className="text-lg leading-relaxed text-slate-500 max-w-3xl font-medium">
          {t('presentation')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => (
          <div
            key={network.slug}
            className="group flex flex-col justify-between rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:border-blue-500/20"
          >
            <div className="space-y-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-50">
                {network.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                  {network.name}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {network.description}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <Link
                href={`/portfolio/${network.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all group-hover:border-blue-600 group-hover:text-blue-600 hover:bg-blue-50"
              >
                Ver Detalhes <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
