import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { MemberForm } from '@/components/MemberForm';
import { db } from '@/libs/DB';
import { Link } from '@/libs/I18nNavigation';
import { getG12Hierarchy } from '@/libs/services/MemberService';
import { members } from '@/models/Schema';

export default async function EditMemberPage(props: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // 1. Busca os dados atuais do membro
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
    .limit(1);

  if (!member) {
    return <div>Membro não encontrado.</div>;
  }

  // 2. Busca líderes para o seletor
  const leaders = await getG12Hierarchy(orgId);

  // 3. Mapeia para o formato do formulário
  const initialData = {
    ...member,
    birthDate: member.birthDate.toISOString(),
    generationSlot: member.generationSlot?.toString() || '',
    email: member.email || '',
    phone: member.phone || '',
    leaderId: member.leaderId || '',
    kidsNotes: member.kidsNotes || '',
  };

  return (
    <div className="min-h-screen space-y-8 bg-[#F8FAFC] p-4 lg:p-10">
      <header>
        <Link href="/dashboard" className="mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900">
          <ArrowLeft size={16} />
          {' '}
          Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Ficha do Discípulo</h1>
      </header>

      <MemberForm
        leaders={leaders as any}
        initialData={initialData as any}
      />
    </div>
  );
}
