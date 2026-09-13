import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  Activity,
  ChevronRight,
  Crown,
  Flame,
  Layers,
  Shield,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { StatCard } from '@/components/Dashboard/StatCard';
import { G12TreeView } from '@/components/G12TreeView';
import { LineageSearch } from '@/components/LineageSearch';
import { Link } from '@/libs/I18nNavigation';
import { SeedService } from '@/libs/Seed';
import { getFilteredG12Hierarchy, getG12Stats, getStatsByGeneration } from '@/libs/services/MemberService';

export default async function DashboardPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await props.params;
  const { search } = await props.searchParams;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // 1. Inicialização Automática (Seed) para novas igrejas
  await SeedService.initializeOrganization(orgId);

  // 2. Busca Nome da Igreja no Clerk
  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({ organizationId: orgId });
  const churchName = organization.name || 'Sua Igreja';

  // 3. Busca paralela de dados
  const [hierarchy, stats, genStats] = await Promise.all([
    getFilteredG12Hierarchy(orgId, search),
    getG12Stats(orgId),
    getStatsByGeneration(orgId),
  ]);

  const totalMembers = hierarchy.length;
  const encounterCount = stats.find(s => s.current_step === 'ENCOUNTER')?.count || 0;
  const sendingCount = stats.find(s => s.current_step === 'SENDING')?.count || 0;

  return (
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 font-sans lg:p-10">

      {/* HEADER DINÂMICO COM NOME DA IGREJA */}
      <header className="flex flex-col items-start justify-between gap-4 px-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">{churchName}</h1>
          <p className="mt-2 text-[10px] font-bold tracking-[0.3em] text-blue-600 uppercase">Visão 1-12-144 • Painel de Controle</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/activity" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-50">
            <Activity size={14} />
            {' '}
            Atividades
          </Link>
        </div>
      </header>

      {/* 1. KPIs DE IMPACTO */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Integrantes" value={totalMembers} icon={Users} color="bg-slate-900" trend="+12% este mês" />
        <StatCard title="No Encontro" value={encounterCount} icon={Flame} color="bg-orange-500" />
        <StatCard title="Enviados" value={sendingCount} icon={Target} color="bg-emerald-600" />
        <Link href="/dashboard/members/new" className="group">
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-4xl border-2 border-dashed border-blue-200 bg-white p-6 transition-all duration-300 group-active:scale-95 hover:border-blue-500 hover:bg-blue-50">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <UserPlus size={24} />
            </div>
            <span className="text-center text-sm font-black tracking-widest text-blue-600 uppercase">Novo Integrante</span>
          </div>
        </Link>
      </section>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-3">

        {/* 2. GESTÃO POR GERAÇÃO (Slicing Horizontal) - Terminologia Atualizada */}
        <section className="space-y-6 xl:col-span-1">
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600"><Layers size={20} /></div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Níveis de Geração</h2>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Distribuição G12</span>
              <Shield size={16} className="text-slate-300" />
            </div>
            <div className="divide-y divide-slate-50">
              {Array.from({ length: 12 }, (_, i) => {
                const slot = i + 1;
                const count = genStats.find(s => s.slot === slot)?.count || 0;
                return (
                  <Link
                    key={slot}
                    href={`/dashboard/generations/${slot}`}
                    className="group flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black ${count > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                        F
                        {slot}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">
                          Geração F
                          {slot}
                        </p>
                        <p className="text-[10px] font-medium tracking-tighter text-slate-400 uppercase">
                          {count}
                          {' '}
                          integrantes vinculados
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. LINHAGEM COMPLETA (Visualização Vertical) */}
        <section className="space-y-6 xl:col-span-2">
          <div className="flex flex-col items-start justify-between gap-4 px-2 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-600"><Crown size={20} /></div>
              <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Mapa de Linhagem</h2>
            </div>
            <LineageSearch />
          </div>

          <div className="relative rounded-[3rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
            <G12TreeView data={hierarchy as any} />
            <div className="absolute right-8 bottom-8 flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-[9px] font-black tracking-[0.2em] text-white uppercase shadow-xl backdrop-blur-md">
              <TrendingUp size={12} className="text-emerald-400" />
              {' '}
              Visão Ativa
            </div>
          </div>
        </section>

      </div>

      {/* 4. HUB DE KIDs (Mini Dashboard) */}
      <section className="relative overflow-hidden rounded-[3rem] border border-slate-200 bg-white p-8 text-center shadow-xl md:p-12 md:text-left">
        <div className="absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full bg-blue-50 opacity-50" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-10 md:flex-row">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-[10px] font-black tracking-widest text-blue-700 uppercase">
              Próxima Geração
            </div>
            <h2 className="text-4xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
              {churchName}
              {' '}
              Kids
            </h2>
            <p className="max-w-md font-medium text-slate-500">Ensino bíblico e acompanhamento das classes infantis com a mesma precisão do G12.</p>
            <div className="pt-4">
              <Link href="/dashboard/ministries" className="inline-block rounded-2xl bg-slate-900 px-8 py-4 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-blue-600">
                Gerenciar Classes
              </Link>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4 md:w-auto">
            {[
              { label: 'Bercário', count: 0 },
              { label: 'Maternal', count: 0 },
              { label: 'Kids 1', count: 0 },
              { label: 'Juniores', count: 0 },
            ].map(cls => (
              <div key={cls.label} className="group flex flex-col items-center gap-1 rounded-4xl border border-b-4 border-slate-100 border-b-blue-200 bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-lg">
                <span className="text-2xl font-black text-slate-900">{cls.count}</span>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{cls.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center">
        <p className="text-[10px] font-black tracking-[0.5em] text-slate-300 uppercase">
          {churchName}
          {' '}
          • G12 Vision Management
        </p>
      </footer>
    </div>
  );
}
