import { auth, clerkClient } from '@clerk/nextjs/server';
import { Clock, Mail, ShieldCheck, Users } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import TeamForm from './TeamForm'; // Criaremos em seguida

export default async function TeamPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId, orgRole } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return <div>Selecione uma Igreja</div>;
  }

  const client = await clerkClient();

  // 1. Busca Membros Ativos
  const { data: members } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  // 2. Busca Convites Pendentes
  const { data: invitations } = await client.organizations.getOrganizationInvitationList({
    organizationId: orgId,
    status: ['pending'],
  });

  const isAdmin = orgRole === 'org:admin';

  return (
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 font-sans lg:p-10">

      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-xl">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">Gestão de Equipe</h1>
            <p className="mt-2 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Administradores e Obreiros</p>
          </div>
        </div>

        {isAdmin && <TeamForm />}
      </header>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">

        {/* LISTA DE MEMBROS ATIVOS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600"><ShieldCheck size={18} /></div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Equipe Ativa</h2>
          </div>

          <div className="divide-y divide-slate-50 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl">
            {members.map(m => (
              <div key={m.id} className="group flex items-center justify-between p-6 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 font-black text-slate-400">
                    {m.publicUserData?.firstName?.[0] || 'U'}
                    {m.publicUserData?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {m.publicUserData?.firstName}
                      {' '}
                      {m.publicUserData?.lastName}
                    </p>
                    <p className="mt-0.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">{m.role === 'org:admin' ? 'Administrador' : 'Colaborador'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-[9px] font-black tracking-widest text-emerald-600 uppercase">
                  Ativo
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LISTA DE CONVITES PENDENTES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-600"><Clock size={18} /></div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Convites Pendentes</h2>
          </div>

          <div className="divide-y divide-slate-50 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl">
            {invitations.map(inv => (
              <div key={inv.id} className="group flex items-center justify-between p-6 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{inv.emailAddress}</p>
                    <p className="mt-0.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      Enviado em
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[9px] font-black tracking-widest text-amber-600 uppercase">Aguardando</span>
                </div>
              </div>
            ))}

            {invitations.length === 0 && (
              <div className="space-y-2 p-20 text-center">
                <p className="text-sm font-bold tracking-widest text-slate-300 uppercase italic">Nenhum convite pendente</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
