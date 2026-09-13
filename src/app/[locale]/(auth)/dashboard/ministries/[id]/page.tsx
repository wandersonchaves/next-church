import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, Briefcase, ShieldCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { db } from '@/libs/DB';
import { Link } from '@/libs/I18nNavigation';
import { memberMinistries, members, ministries } from '@/models/Schema';
import VolunteerManager from './VolunteerManager';

export default async function MinistryDetailsPage(props: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // 1. Busca os dados do ministério
  const [ministry] = await db
    .select()
    .from(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.organizationId, orgId)))
    .limit(1);

  if (!ministry) {
    return <div>Ministério não encontrado.</div>;
  }

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
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 font-sans lg:p-10">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard/ministries" className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900">
          <ArrowLeft size={16} />
          {' '}
          Voltar para Ministérios
        </Link>

        <div className="flex flex-col items-start justify-between gap-6 rounded-[3.5rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/40 md:flex-row md:items-center">
          <div className="flex items-center gap-6">
            <div className="rounded-3xl bg-indigo-600 p-5 text-white shadow-lg shadow-indigo-100">
              <Briefcase size={32} />
            </div>
            <div>
              <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">{ministry.name}</h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">{ministry.description || 'Gestão estratégica de voluntários e operação do setor ministerial.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-3 text-emerald-600">
            <ShieldCheck size={20} />
            <span className="text-[10px] font-black tracking-widest uppercase">Setor Ativo</span>
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
