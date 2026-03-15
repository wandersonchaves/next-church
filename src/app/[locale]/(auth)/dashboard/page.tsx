import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { Baby, LayoutDashboard, Plus, Search, Send, Target, TrendingUp, Users } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { G12TreeNode } from '@/components/G12TreeView';
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
    return <div className="p-20 text-center font-bold text-slate-400">Aguardando seleção de organização...</div>;
  }

  const [flatData, statsData] = await Promise.all([
    getFilteredG12Hierarchy(orgId, q, step),
    getG12Stats(orgId),
  ]);

  const treeData = buildG12Tree(flatData);
  const totalMembers = statsData.reduce((acc, s) => acc + Number(s.count), 0);

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 font-sans antialiased lg:p-10">
      <div className="mx-auto max-w-400 space-y-10">

        {/* TOP BAR: Branding & Search */}
        <header className="flex flex-col items-start justify-between gap-6 xl:flex-row xl:items-center">
          <div className="flex items-center gap-5">
            <div className="rounded-[1.2rem] bg-blue-600 p-3 shadow-xl shadow-blue-200">
              <LayoutDashboard size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
                Philadelphia
                <span className="font-light text-blue-600">Hub</span>
              </h1>
              <p className="mt-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase">
                Vision Management System
                {' '}
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                {' '}
                {totalMembers}
                {' '}
                Integrantes
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-4 xl:w-auto">
            <form className="group relative flex-1 md:w-80">
              <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Pesquisar linhagem ou membro..."
                className="w-full rounded-[1.2rem] border-none bg-white py-3.5 pr-4 pl-12 text-sm font-bold text-slate-700 shadow-sm transition-all outline-none placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10"
              />
            </form>
            <Link
              href="/dashboard/members/new"
              className="group flex items-center gap-2 rounded-[1.2rem] bg-slate-900 px-8 py-3.5 text-sm font-black tracking-widest text-white uppercase shadow-2xl transition-all hover:bg-blue-600 active:scale-95"
            >
              <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
              Novo Discípulo
            </Link>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">

          {/* LEFT COLUMN: TREE & STATS (8/12) */}
          <main className="space-y-10 lg:col-span-8">

            {/* KPI ROW */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <ModernStatCard icon={<Target size={22} />} label="No Encontro" value={statsData.find(s => s.current_step === 'ENCOUNTER')?.count || 0} color="purple" active={step === 'ENCOUNTER'} />
              <ModernStatCard icon={<Send size={22} />} label="Enviados" value={statsData.find(s => s.current_step === 'SENDING')?.count || 0} color="emerald" active={step === 'SENDING'} />
              <ModernStatCard icon={<TrendingUp size={22} />} label="Conversão" value="+12%" color="blue" />
            </div>

            {/* TREE CONTAINER */}
            <div className="overflow-hidden rounded-[3rem] border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50">
              <div className="flex items-center justify-between border-b border-slate-50 bg-linear-to-r from-white to-slate-50/50 px-10 py-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-800">MAPA DE LINHAGEM</h2>
                  <p className="mt-1 text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase">Hierarquia Estratégica G12</p>
                </div>
                {(q || step) && (
                  <Link href="/dashboard" className="rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black text-slate-500 uppercase transition-colors hover:bg-red-50 hover:text-red-600">
                    Limpar Filtros
                  </Link>
                )}
              </div>

              <div className="max-h-225 overflow-y-auto p-8 md:p-12">
                {treeData.length > 0
                  ? (
                      <div className="space-y-4">
                        {treeData.map(rootNode => <G12TreeNode key={rootNode.id} node={rootNode} />)}
                      </div>
                    )
                  : (
                      <div className="space-y-6 py-32 text-center">
                        <div className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-[2.5rem] border-4 border-dashed border-blue-100 bg-blue-50 text-blue-200">
                          <Users size={48} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black tracking-tight text-slate-800 uppercase">Sua Rede está Pronta</h3>
                          <p className="mx-auto max-w-xs text-sm font-medium text-slate-400">Cadastre o Pastor Principal para iniciar a visualização da hierarquia.</p>
                        </div>
                        <Link href="/dashboard/members/new" className="inline-block rounded-2xl border-2 border-slate-100 bg-white px-8 py-3 text-xs font-black tracking-widest text-slate-600 uppercase shadow-sm transition-all hover:border-blue-500 hover:text-blue-600">
                          Começar Agora
                        </Link>
                      </div>
                    )}
              </div>
            </div>
          </main>

          {/* RIGHT COLUMN: KIDS & TOOLS (4/12) */}
          <aside className="space-y-10 lg:col-span-4">

            {/* KIDS SECTION */}
            <div className="relative overflow-hidden rounded-[3rem] border border-slate-200/60 bg-white p-10 shadow-xl">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <Baby size={120} className="text-slate-900" />
              </div>

              <div className="mb-10 flex items-center gap-4">
                <div className="rounded-2xl bg-pink-50 p-4 text-pink-500 shadow-inner"><Baby size={28} /></div>
                <div>
                  <h3 className="text-xl leading-none font-black tracking-tight text-slate-800 uppercase">Kids Hub</h3>
                  <p className="mt-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Distribuição Ministerial</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KidsTile label="Bercário" count={0} />
                <KidsTile label="Maternal" count={0} />
                <KidsTile label="Kids 1" count={0} />
                <KidsTile label="Juniores" count={0} />
              </div>

              <div className="mt-8 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-2xl shadow-slate-900/20">
                <span className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Total Kids</span>
                <span className="mr-2 text-2xl font-black italic">0</span>
              </div>
            </div>

            {/* TIP BOX */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-linear-to-br from-blue-600 to-indigo-700 p-10 text-white shadow-2xl">
              <ShieldCheck className="absolute -right-6 -bottom-6 h-40 w-40 transform text-white/10 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12" />
              <div className="relative z-10 space-y-4">
                <h4 className="text-xs font-black tracking-[0.2em] text-blue-200 uppercase">Dica do Tech Lead</h4>
                <p className="text-lg leading-tight font-bold">
                  Maximize o crescimento utilizando a
                  {' '}
                  <span className="text-blue-200 underline decoration-2 underline-offset-4">promoção de passos</span>
                  {' '}
                  diretamente na linhagem.
                </p>
                <p className="text-sm font-medium text-blue-100/80">
                  Cada clique gera um registro de auditoria, mantendo a integridade da jornada G12.
                </p>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

// SUB-COMPONENTS COM DESIGN PREMIUM
function ModernStatCard({ icon, label, value, color, active }: { icon: React.ReactNode; label: string; value: any; color: 'purple' | 'emerald' | 'blue'; active?: boolean }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600 shadow-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-100',
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100',
  };

  return (
    <div className={`rounded-4xl border-2 bg-white p-1 transition-all duration-500 ${active ? 'scale-105 border-blue-500 shadow-2xl shadow-blue-100' : 'border-white shadow-xl shadow-slate-200/50'}`}>
      <div className="flex items-center justify-between rounded-[1.8rem] bg-white p-6">
        <div>
          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
          <p className="text-4xl leading-none font-black tracking-tighter text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-4 ${colors[color]} transition-transform duration-500 group-hover:rotate-6`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function KidsTile({ label, count }: { label: string; count: number }) {
  return (
    <div className="cursor-default rounded-3xl border border-slate-100 bg-slate-50 p-5 transition-all hover:bg-white hover:shadow-lg">
      <p className="mb-1 text-[9px] font-black tracking-tighter text-slate-400 uppercase">{label}</p>
      <p className="text-xl leading-none font-black text-slate-800">{count}</p>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
