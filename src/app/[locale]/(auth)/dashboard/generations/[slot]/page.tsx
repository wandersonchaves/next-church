import { auth, clerkClient } from '@clerk/nextjs/server';
import { ArrowLeft, Eye, MessageCircle, Shield, User } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { DeleteMemberButton } from '@/components/DeleteMemberButton';
import { Link } from '@/libs/I18nNavigation';
import { getMembersByGenerationSlot } from '@/libs/services/MemberService';

export default async function GenerationPage(props: { params: Promise<{ slot: string; locale: string }> }) {
  const { slot, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // Busca Nome da Igreja
  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({ organizationId: orgId });
  const churchName = organization.name || 'Sua Igreja';

  const slotNumber = Number.parseInt(slot);
  const members = await getMembersByGenerationSlot(orgId, slotNumber);

  return (
    <div className="min-h-screen space-y-8 bg-[#F8FAFC] p-4 lg:p-10">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900">
          <ArrowLeft size={16} />
          {' '}
          Voltar ao Painel
        </Link>

        <div className="flex items-center gap-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="rounded-3xl bg-indigo-600 p-5 text-2xl font-black text-white shadow-lg shadow-indigo-100">
            F
            {slot}
          </div>
          <div>
            <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
              Geração F
              {slot}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Visualizando todos os integrantes posicionados na Geração F
              {slot}
              {' '}
              da
              {churchName}
              .
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {members.map(m => (
          <div key={m.id} className="group rounded-4xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:border-indigo-200">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 font-black text-slate-400">
                  {m.firstName[0]}
                  {m.lastName[0]}
                </div>
                <div>
                  <p className="leading-none font-bold text-slate-800">
                    {m.firstName}
                    {' '}
                    {m.lastName}
                  </p>
                  <p className="mt-1.5 text-[10px] font-black tracking-widest text-blue-600 uppercase">{m.currentStep.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`https://wa.me/${m.phone}`}
                  target="_blank"
                  className="rounded-lg p-2 text-emerald-500 transition-colors hover:bg-emerald-50"
                  title="WhatsApp"
                >
                  <MessageCircle size={18} />
                </a>
                <Link
                  href={`/dashboard/members/${m.id}/edit`}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  title="Ver Detalhes / Editar"
                >
                  <Eye size={18} />
                </Link>
                <DeleteMemberButton memberId={m.id} memberName={`${m.firstName} ${m.lastName}`} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <div className="flex items-center gap-2">
                <User size={12} className="text-slate-300" />
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Líder:</span>
                <span className="text-[10px] font-black text-slate-600 uppercase">{m.leaderName || 'Pastor Principal'}</span>
              </div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-100 bg-white px-6 py-32 text-center">
            <Shield size={48} className="mb-4 text-slate-100" />
            <h3 className="text-lg font-black tracking-widest text-slate-400 uppercase">Ninguém posicionado nesta geração ainda</h3>
          </div>
        )}
      </div>
    </div>
  );
}
