import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { Filter, LayoutGrid, Search, Send, ShieldCheck, Target, Users } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { G12TreeNode } from '@/components/G12TreeView';
import { getG12Hierarchy, getG12Stats } from '@/libs/services/MemberService';
import { getI18nMetadata } from '@/utils/I18nMetadata';
import { buildG12Tree } from '@/utils/TreeUtils';

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: DashboardPageProps): Promise<Metadata> {
  return getI18nMetadata('Dashboard', props.params);
}

export default async function DashboardPage(props: DashboardPageProps) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return <div>Selecione uma Organização</div>;
  }

  const [flatData, statsData] = await Promise.all([
    getG12Hierarchy(orgId),
    getG12Stats(orgId),
  ]);

  const treeData = buildG12Tree(flatData);
  const totalMembers = flatData.length;

  return (
    <div className="min-h-screen space-y-8 bg-[#F8FAFC] p-4 lg:p-10">
      {/* Barra de Título Superior */}
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="h-8 w-2 rounded-full bg-blue-600" />
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
              Philadelphia Hub
            </h1>
          </div>
          <p className="ml-4 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Painel de Controle Estratégico •
            {' '}
            {totalMembers}
            {' '}
            Integrantes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="group relative hidden sm:block">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
            <input
              type="text"
              placeholder="Localizar discípulo..."
              className="w-64 rounded-2xl border-2 border-slate-100 bg-white py-2.5 pr-4 pl-10 text-sm font-medium shadow-sm transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5"
            />
          </div>
          <button className="rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:border-blue-100 hover:text-blue-600">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Grid de Alta Performance */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<Target size={22} />} label="No Encontro" value={statsData.find(s => s.current_step === 'ENCOUNTER')?.count || 0} color="purple" />
        <StatTile icon={<ShieldCheck size={22} />} label="Na Escola" value={statsData.find(s => s.current_step === 'SCHOOL_OF_LEADERS')?.count || 0} color="amber" />
        <StatTile icon={<Send size={22} />} label="Enviados" value={statsData.find(s => s.current_step === 'SENDING')?.count || 0} color="emerald" />
        <StatTile icon={<LayoutGrid size={22} />} label="Novas Decisões" value={statsData.find(s => s.current_step === 'DECISION')?.count || 0} color="blue" />
      </div>

      {/* Container da Árvore com Scroll de Performance */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
        <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/20 px-10 py-8">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Mapa de Linhagem</h2>
            <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase italic">Navegue pelas gerações e frentes ministeriais</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-600 uppercase">
              Modo Expansivo
            </span>
          </div>
        </div>

        <div className="max-h-[1200px] overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed p-6 md:p-10">
          {treeData.length > 0
            ? (
                <div className="mx-auto max-w-5xl space-y-4">
                  {treeData.map(rootNode => (
                    <G12TreeNode key={rootNode.id} node={rootNode} />
                  ))}
                </div>
              )
            : (
                <div className="py-40 text-center">
                  <div className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-[2rem] border-4 border-dashed border-slate-100 bg-slate-50 text-slate-200">
                    <Users size={40} />
                  </div>
                  <h3 className="mt-6 text-xl font-black tracking-tight text-slate-800 uppercase">Rede em Construção</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-slate-400">Inicie sua árvore cadastrando o primeiro líder da sua organização.</p>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'purple' | 'amber' | 'emerald' | 'blue' }) {
  const themes = {
    purple: 'from-purple-500 to-indigo-600 shadow-purple-100',
    amber: 'from-amber-400 to-orange-500 shadow-amber-100',
    emerald: 'from-emerald-400 to-teal-600 shadow-emerald-100',
    blue: 'from-blue-500 to-blue-700 shadow-blue-100',
  };

  return (
    <div className="group rounded-[2rem] border border-slate-100 bg-white p-1 shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between rounded-[1.8rem] bg-white p-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
          <p className="text-4xl font-black tracking-tighter text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-4 ${themes[color]} transform text-white shadow-lg transition-transform group-hover:rotate-6`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
