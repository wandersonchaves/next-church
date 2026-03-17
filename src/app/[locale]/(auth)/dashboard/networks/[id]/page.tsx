import { auth } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { getFilteredG12Hierarchy } from '@/libs/services/MemberService';
import { members } from '@/models/Schema';
import { G12TreeView } from '@/components/G12TreeView';
import { eq, and } from 'drizzle-orm';
import { Crown, ArrowLeft, TrendingUp, Users } from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import { setRequestLocale } from 'next-intl/server';
import { buildG12Tree } from '@/utils/TreeUtils';

export default async function NetworkPage(props: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  // 1. Busca os dados do líder da rede para o header
  const [leader] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
    .limit(1);

  if (!leader) return <div>Líder não encontrado.</div>;

  // 2. Busca a sub-hierarquia a partir deste líder
  const flatData = await getFilteredG12Hierarchy(orgId, undefined, undefined, id);
  const treeData = buildG12Tree(flatData);

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest">
          <ArrowLeft size={16} /> Voltar ao Mapa Geral
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-amber-500 text-white rounded-3xl shadow-lg shadow-amber-100">
              <Crown size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rede de {leader.firstName}</h1>
              <p className="text-sm text-slate-500 font-medium mt-2">Visualizando linhagem e expansão a partir da liderança de {leader.firstName} {leader.lastName}.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <span className="text-sm font-black uppercase tracking-widest">{flatData.length} Membros</span>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32" />
          <G12TreeView data={treeData} />

          <div className="absolute bottom-10 right-10 flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">
            <TrendingUp size={12} className="text-emerald-400" /> Foco de Rede Ativo
          </div>
        </div>
      </section>
    </div>
  );
}
