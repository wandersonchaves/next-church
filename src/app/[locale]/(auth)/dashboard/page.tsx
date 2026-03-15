import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { Baby, Backpack, BookOpen, GraduationCap, Info, LayoutDashboard, Plus, Search, Send, Target, Users } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { StatCard } from '@/components/Dashboard/StatCard';
import { G12TreeView } from '@/components/G12TreeView';
import { Link } from '@/libs/I18nNavigation';
import { getFilteredG12Hierarchy, getG12Stats } from '@/libs/services/MemberService';
import { getI18nMetadata } from '@/utils/I18nMetadata';
import { buildG12Tree } from '@/utils/TreeUtils';

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; step?: string }>;
};

export async function generateMetadata(props: DashboardPageProps): Promise<Metadata> {
  return getI18nMetadata('Dashboard', props.params);
}

export default async function DashboardPage(props: DashboardPageProps) {
  const { locale } = await props.params;
  const { q, step } = await props.searchParams;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  const [flatData, statsData] = await Promise.all([
    getFilteredG12Hierarchy(orgId, q, step),
    getG12Stats(orgId),
  ]);

  const treeData = buildG12Tree(flatData);
  const totalMembers = statsData.reduce((acc, s) => acc + Number(s.count), 0);

  return (
    <div className="space-y-6 p-4 lg:space-y-10 lg:p-10">
      <div className="mx-auto max-w-400 space-y-6 lg:space-y-10">

        {/* BARRA DE FILTROS E PESQUISA: Stack em Mobile */}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:gap-6 lg:rounded-[2.5rem] lg:p-6 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-blue-600 lg:h-6 lg:w-6" />
            <h2 className="text-sm leading-none font-black tracking-widest text-slate-800 uppercase">Painel</h2>
            <span className="mx-1 h-1 w-1 rounded-full bg-slate-200 lg:mx-2" />
            <p className="truncate text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {totalMembers}
              {' '}
              Membros
            </p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row xl:w-auto">
            <form className="group relative flex-1 xl:w-80">
              <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar linhagem..."
                className="w-full rounded-xl border-none bg-slate-50 py-2.5 pr-4 pl-10 text-sm font-bold text-slate-700 transition-all outline-none focus:ring-4 focus:ring-blue-500/5"
              />
            </form>
            <Link
              href="/dashboard/members/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all hover:bg-blue-600 active:scale-95"
            >
              <Plus size={16} />
              {' '}
              Novo Membro
            </Link>
          </div>
        </div>

        {/* STATS AREA: Grid Responsivo Real (Fase 6) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[4fr_1fr] lg:gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
            <StatCard icon={<Target size={24} />} label="Encontro" value={statsData.find(s => s.current_step === 'ENCOUNTER')?.count || 0} color="purple" active={step === 'ENCOUNTER'} />
            <StatCard icon={<Send size={24} />} label="Enviados" value={statsData.find(s => s.current_step === 'SENDING')?.count || 0} color="emerald" active={step === 'SENDING'} />
            <StatCard icon={<Users size={24} />} label="Total" value={totalMembers} color="blue" />
          </div>

          <div className="flex flex-row items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl lg:flex-col lg:justify-center lg:gap-2 lg:rounded-[2.5rem]">
            <div className="rounded-xl bg-pink-50 p-3">
              <Baby size={20} className="text-pink-500" />
            </div>
            <div className="flex flex-col lg:items-center">
              <span className="text-3xl font-bold tracking-tighter text-slate-900 lg:text-4xl">0</span>
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Kids Hub</span>
            </div>
          </div>
        </div>

        {/* LOWER AREA: Sidebar empilha abaixo no Mobile */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <main className="order-2 lg:order-1 lg:col-span-8 xl:col-span-9">
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50 lg:rounded-[3rem]">
              <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-6 py-6 lg:px-10">
                <h2 className="text-xs font-black tracking-widest text-slate-800 uppercase lg:text-sm">Linhagem G12</h2>
                {(q || step) && (
                  <Link href="/dashboard" className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase">
                    Limpar
                  </Link>
                )}
              </div>

              <div className="p-2 lg:p-8">
                {treeData.length > 0
                  ? (
                      <G12TreeView data={treeData} />
                    )
                  : (
                      <div className="px-4 py-20 text-center lg:py-32">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-blue-100 bg-blue-50 text-blue-200 lg:h-24 lg:w-24 lg:rounded-[2.5rem]">
                          <Users size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase lg:text-xl">Inicie sua Linhagem</h3>
                        <p className="mx-auto mt-2 max-w-xs text-xs text-slate-400 lg:text-sm">Cadastre o Pastor Principal para começar.</p>
                      </div>
                    )}
              </div>
            </div>
          </main>

          <aside className="order-1 space-y-6 lg:order-2 lg:col-span-4 xl:col-span-3">
            <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xl lg:rounded-[3rem] lg:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Info size={18} /></div>
                <h3 className="text-[10px] font-black tracking-widest text-slate-800 uppercase lg:text-xs">Classes Kids</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <StatCard icon={<Baby size={16} />} label="Bercário" value={0} color="pink" size="compact" />
                <StatCard icon={<BookOpen size={16} />} label="Maternal" value={0} color="rose" size="compact" />
                <StatCard icon={<Backpack size={16} />} label="Kids 1" value={0} color="orange" size="compact" />
                <StatCard icon={<GraduationCap size={16} />} label="Juniores" value={0} color="indigo" size="compact" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
