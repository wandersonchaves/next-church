import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getI18nMetadata } from '@/utils/I18nMetadata';

type IndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IndexPageProps): Promise<Metadata> {
  return getI18nMetadata('Index', props.params);
}

export default async function Index(props: IndexPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6 py-8">
      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Recursos do Philadelphia Hub</h3>

      <ul className="grid grid-cols-1 gap-4 text-base md:grid-cols-2">
        <li className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="font-bold text-blue-900">Árvore G12 Recursiva</p>
            <p className="text-xs text-blue-700">Visualize toda a sua rede de discipulado 1-12-144.</p>
          </div>
        </li>

        <li className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-bold text-purple-900">Jornada de 7 Passos</p>
            <p className="text-xs text-purple-700">Acompanhe cada membro da Decisão até o Envio.</p>
          </div>
        </li>

        <li className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4">
          <span className="text-2xl">🧸</span>
          <div>
            <p className="font-bold text-teal-900">Módulo Kids Inteligente</p>
            <p className="text-xs text-teal-700">Classificação automática por idade (0-14 anos).</p>
          </div>
        </li>

        <li className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold text-amber-900">Analytics de Crescimento</p>
            <p className="text-xs text-amber-700">Estatísticas detalhadas de cada passo da jornada.</p>
          </div>
        </li>

        <li className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="font-bold text-green-900">Segurança Multi-tenancy</p>
            <p className="text-xs text-green-700">Isolamento total de dados por Igreja (Clerk Org).</p>
          </div>
        </li>

        <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-bold text-slate-900">Arquitetura Moderna</p>
            <p className="text-xs text-slate-700">Construído com Next.js 15, PostgreSQL e Drizzle ORM.</p>
          </div>
        </li>
      </ul>

      <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center text-white shadow-xl">
        <p className="text-lg font-medium">Pronto para organizar sua igreja?</p>
        <p className="mb-4 text-sm text-slate-400 italic">Selecione sua organização e comece o discipulado agora.</p>
      </div>
    </div>
  );
};
