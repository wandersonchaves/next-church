import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, Crown, TrendingUp, Users } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { G12TreeView } from '@/components/G12TreeView';
import { db } from '@/libs/DB';
import { Link } from '@/libs/I18nNavigation';
import { getFilteredG12Hierarchy } from '@/libs/services/MemberService';
import { members } from '@/models/Schema';
import { buildG12Tree } from '@/utils/TreeUtils';

export default async function NetworkPage(props: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // 1. Busca os dados do líder da rede para o header
  const [leader] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
    .limit(1);

  if (!leader) {
    return <div>Líder não encontrado.</div>;
  }

  // 2. Busca a sub-hierarquia a partir deste líder
  const flatData = await getFilteredG12Hierarchy(orgId, undefined, undefined, id);
  const treeData = buildG12Tree(flatData);

  return (
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 lg:p-10">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900">
          <ArrowLeft size={16} />
          {' '}
          Voltar ao Mapa Geral
        </Link>

        <div className="flex flex-col items-start justify-between gap-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl md:flex-row md:items-center">
          <div className="flex items-center gap-6">
            <div className="rounded-3xl bg-amber-500 p-5 text-white shadow-lg shadow-amber-100">
              <Crown size={32} />
            </div>
            <div>
              <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
                Rede de
                {leader.firstName}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Visualizando linhagem e expansão a partir da liderança de
                {leader.firstName}
                {' '}
                {leader.lastName}
                .
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-white">
              <Users size={18} className="text-blue-400" />
              <span className="text-sm font-black tracking-widest uppercase">
                {flatData.length}
                {' '}
                Membros
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-[3rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-10">
          <div className="absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full bg-blue-50/30" />
          <G12TreeView data={treeData} />

          <div className="absolute right-10 bottom-10 flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-[9px] font-black tracking-[0.2em] text-white uppercase shadow-xl backdrop-blur-md">
            <TrendingUp size={12} className="text-emerald-400" />
            {' '}
            Foco de Rede Ativo
          </div>
        </div>
      </section>
    </div>
  );
}
