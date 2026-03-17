import { auth } from '@clerk/nextjs/server';
import { getG12Hierarchy, getG12Stats, getStatsByGeneration } from '@/libs/services/MemberService';
import { G12TreeView } from '@/components/G12TreeView';
import { StatCard } from '@/components/Dashboard/StatCard';
import { Alert } from '@/components/Dashboard/Alert';
import {
  Users, UserPlus, Target, Flame,
  Search, Shield, Crown, TrendingUp,
  Layers, ChevronRight
} from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import { setRequestLocale } from 'next-intl/server';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  // Busca paralela para máxima performance
  const [hierarchy, stats, genStats] = await Promise.all([
    getG12Hierarchy(orgId),
    getG12Stats(orgId),
    getStatsByGeneration(orgId)
  ]);

  const totalMembers = hierarchy.length;
  const encounterCount = stats.find(s => s.current_step === 'ENCOUNTER')?.count || 0;
  const sendingCount = stats.find(s => s.current_step === 'SENDING')?.count || 0;

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen font-sans">

      {/* 1. KPIs DE IMPACTO */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Membros" value={totalMembers} icon={Users} color="bg-slate-900" trend="+12% este mês" />
        <StatCard title="No Encontro" value={encounterCount} icon={Flame} color="bg-orange-500" />
        <StatCard title="Enviados" value={sendingCount} icon={Target} color="bg-emerald-600" />
        <Link href="/dashboard/members/new" className="group">
          <div className="h-full p-6 bg-white border-2 border-dashed border-blue-200 rounded-4xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group-active:scale-95">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserPlus size={24} />
            </div>
            <span className="text-sm font-black text-blue-600 uppercase tracking-widest">Novo Membro</span>
          </div>
        </Link>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

        {/* 2. GESTÃO POR GERAÇÃO (Slicing Horizontal) */}
        <section className="xl:col-span-1 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Layers size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Frentes de Trabalho</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição G12</span>
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
                    className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${count > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                        F{slot}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Equipe Frente {slot}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{count} integrantes na rede</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. LINHAGEM COMPLETA (Visualização Vertical) */}
        <section className="xl:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Crown size={20} /></div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Mapa de Linhagem</h2>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar na rede..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-6 md:p-8 relative">
            <G12TreeView data={hierarchy as any} />
            <div className="absolute bottom-8 right-8 flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">
              <TrendingUp size={12} className="text-emerald-400" /> Visão 1-12-144 Ativa
            </div>
          </div>
        </section>

      </div>

      {/* 4. HUB DE KIDs (Mini Dashboard) */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              Próxima Geração
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Philadelphia Kids Hub</h2>
            <p className="text-slate-500 font-medium max-w-md">Gerencie as classes de Bercário, Maternal, Kids e Juniores com a mesma precisão do G12.</p>
            <div className="pt-4">
              <Link href="/dashboard/ministries" className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl inline-block">
                Acessar Classes Kids
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            {[
              { label: 'Bercário', count: 0 },
              { label: 'Maternal', count: 0 },
              { label: 'Kids 1', count: 0 },
              { label: 'Juniores', count: 0 }
            ].map((cls) => (
              <div key={cls.label} className="p-6 bg-slate-50 rounded-4xl border border-slate-100 flex flex-col items-center gap-1 group hover:bg-white hover:shadow-lg transition-all border-b-4 border-b-blue-200">
                <span className="text-2xl font-black text-slate-900">{cls.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cls.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Philadelphia Hub • G12 Vision Management</p>
      </footer>
    </div>
  );
}
