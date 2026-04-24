import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { getMembersByGenerationSlot } from '@/libs/services/MemberService';
import { Shield, ArrowLeft, User, MessageCircle, Eye } from 'lucide-react';
import { Link } from '@/libs/I18nNavigation';
import { setRequestLocale } from 'next-intl/server';
import { DeleteMemberButton } from '@/components/DeleteMemberButton';

export default async function GenerationPage(props: { params: Promise<{ slot: string, locale: string }> }) {
  const { slot, locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  // Busca Nome da Igreja
  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({ organizationId: orgId });
  const churchName = organization.name || 'Sua Igreja';

  const slotNumber = parseInt(slot);
  const members = await getMembersByGenerationSlot(orgId, slotNumber);

  return (
    <div className="p-4 lg:p-10 space-y-8 bg-[#F8FAFC] min-h-screen">
      <header className="flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest">
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>

        <div className="flex items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="p-5 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-100 font-black text-2xl">
            F{slot}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Geração {slot}</h1>
            <p className="text-sm text-slate-500 font-medium mt-2">Visualizando todos os integrantes posicionados na {slot}ª Geração da {churchName}.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {members.map((m) => (
          <div key={m.id} className="bg-white p-6 rounded-4xl border border-slate-100 shadow-md hover:border-indigo-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black">
                  {m.firstName[0]}{m.lastName[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-none">{m.firstName} {m.lastName}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1.5">{m.currentStep.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`https://wa.me/${m.phone}`}
                  target="_blank"
                  className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={18} />
                </a>
                <Link
                  href={`/dashboard/members/${m.id}/edit`}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Ver Detalhes / Editar"
                >
                  <Eye size={18} />
                </Link>
                <DeleteMemberButton memberId={m.id} memberName={`${m.firstName} ${m.lastName}`} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={12} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Líder:</span>
                <span className="text-[10px] font-black text-slate-600 uppercase">{m.leaderName || 'Pastor Principal'}</span>
              </div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-6">
            <Shield size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Ninguém posicionado nesta geração ainda</h3>
          </div>
        )}
      </div>
    </div>
  );
}
