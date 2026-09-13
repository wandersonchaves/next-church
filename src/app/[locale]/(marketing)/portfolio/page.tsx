import type { Metadata } from 'next';
import { ArrowRight, Baby, Flower2, Heart, Shield, Users, Zap } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { getI18nMetadata } from '@/utils/I18nMetadata';

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
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
      <header className="space-y-4 text-center md:text-left">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Redes de Discipulado</h2>
        <p className="max-w-3xl text-lg leading-relaxed font-medium text-slate-500">
          {t('presentation')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {networks.map(network => (
          <div
            key={network.slug}
            className="group flex flex-col justify-between rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:border-blue-500/20"
          >
            <div className="space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 transition-colors group-hover:bg-blue-50">
                {network.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl leading-none font-black tracking-tight text-slate-900 uppercase">
                  {network.name}
                </h3>
                <p className="text-sm leading-relaxed font-medium text-slate-500">
                  {network.description}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-50 pt-6">
              <Link
                href={`/portfolio/${network.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-100 px-6 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase transition-all group-hover:border-blue-600 group-hover:text-blue-600 hover:bg-blue-50"
              >
                Ver Detalhes
                {' '}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
