import { auth } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { ministries, memberMinistries, members } from '@/models/Schema';
import { eq, and } from 'drizzle-orm';
import { Briefcase, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import { setRequestLocale } from 'next-intl/server';
import VolunteerManager from './VolunteerManager';

export default async function MinistryDetailsPage(props: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  // 1. Busca os dados do ministério
  const [ministry] = await db
    .select()
    .from(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.organizationId, orgId)))
    .limit(1);

  if (!ministry) return <div>Ministério não encontrado.</div>;

  // 2. Busca todos os membros da organização (para o seletor)
  const allOrgMembers = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(members)
    .where(eq(members.organizationId, orgId));

  // 3. Busca os voluntários atualmente vinculados
  const currentVolunteers = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      role: memberMinistries.role,
    })
    .from(memberMinistries)
    .innerJoin(members, eq(memberMinistries.memberId, members.id))
    .where(eq(memberMinistries.ministryId, id));

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen font-sans">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard/ministries" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest">
          <ArrowLeft size={16} /> Voltar para Ministérios
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-100">
              <Briefcase size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{ministry.name}</h1>
              <p className="text-sm text-slate-500 font-medium max-w-xl mt-2">{ministry.description || "Gestão estratégica de voluntários e operação do setor ministerial."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <ShieldCheck size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Setor Ativo</span>
          </div>
        </div>
      </header>

      {/* Componente Cliente para Gerenciamento de Equipe */}
      <VolunteerManager
        ministryId={id}
        allMembers={allOrgMembers}
        initialVolunteers={currentVolunteers}
      />
    </div>
  );
}
