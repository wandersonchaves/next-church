import { auth, clerkClient } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { Users, Mail, ShieldCheck, Clock, UserPlus, Trash2 } from 'lucide-react';
import TeamForm from './TeamForm'; // Criaremos em seguida

export default async function TeamPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId, orgRole } = await auth();
  setRequestLocale(locale);

  if (!orgId) return <div>Selecione uma Igreja</div>;

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
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen font-sans">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Gestão de Equipe</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Administradores e Obreiros</p>
          </div>
        </div>

        {isAdmin && <TeamForm />}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

        {/* LISTA DE MEMBROS ATIVOS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck size={18} /></div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Equipe Ativa</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl divide-y divide-slate-50 overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">
                    {m.publicUserData?.firstName?.[0] || 'U'}{m.publicUserData?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{m.publicUserData?.firstName} {m.publicUserData?.lastName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{m.role === 'org:admin' ? 'Administrador' : 'Colaborador'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Ativo
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LISTA DE CONVITES PENDENTES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Clock size={18} /></div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Convites Pendentes</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl divide-y divide-slate-50 overflow-hidden">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{inv.emailAddress}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Enviado em {new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">Aguardando</span>
                </div>
              </div>
            ))}

            {invitations.length === 0 && (
              <div className="p-20 text-center space-y-2">
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Nenhum convite pendente</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
