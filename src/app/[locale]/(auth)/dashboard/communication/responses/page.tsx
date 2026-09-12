import { auth } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { MessageCircle, User, Check, X, ShieldAlert, Waves } from 'lucide-react';
import { NotificationService } from '@/libs/services/NotificationService';
import { Link } from '@/libs/I18nNavigation';
import { markAsBaptizedAction, markAsInactiveAction } from '@/app/[locale]/(auth)/dashboard/members/actions';

export const dynamic = 'force-dynamic';

export default async function SurveyResponsesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  const responses = await NotificationService.getSurveyResponses(orgId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-10 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
              <MessageCircle size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Respostas Interativas</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Triagem de Pesquisas • TelePaz Filadélfia</p>
            </div>
          </div>
          <Link href="/dashboard/communication" className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            Voltar
          </Link>
        </header>

        {/* RESPONSES LIST */}
        <div className="space-y-6">
          {responses.map((res) => {
            const isYes = res.answer.toLowerCase().includes('sim');
            const isNo = res.answer.toLowerCase().includes('não') || res.answer.toLowerCase().includes('nao');

            return (
              <div key={res.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden group hover:border-indigo-200 transition-all">
                <div className="flex flex-col lg:flex-row">
                  
                  {/* MEMBER & CONTEXT */}
                  <div className="p-6 lg:w-1/3 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none">
                          {res.member ? `${res.member.firstName} ${res.member.lastName}` : 'Contato Desconhecido'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{res.member?.generationSlot ? `Geração F${res.member.generationSlot}` : 'Geração ?'}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-100 italic">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sua Pergunta:</p>
                      <p className="text-xs text-slate-500 font-medium">"{res.question}"</p>
                    </div>
                  </div>

                  {/* ANSWER & ACTIONS */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Resposta do Membro:</span>
                      <div className={`mt-2 p-4 rounded-2xl text-sm font-bold ${isYes ? 'bg-emerald-50 text-emerald-700' : isNo ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
                        {res.answer}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-50">
                      <p className="w-full lg:w-auto text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Ações Rápidas:</p>
                      
                      <form action={async () => { 'use server'; await markAsBaptizedAction(res.member!.id, true); }}>
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm">
                          <Waves size={14} /> Batizado
                        </button>
                      </form>

                      <form action={async () => { 'use server'; await markAsInactiveAction(res.member!.id); }}>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-sm">
                          <ShieldAlert size={14} /> Inativar
                        </button>
                      </form>
                      
                      <Link href={`/dashboard/members/${res.member?.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                        <Check size={14} /> Outros
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}

          {responses.length === 0 && (
            <div className="py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
              <X size={48} className="text-slate-100 mb-4" />
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nenhuma resposta interativa ainda</h3>
              <p className="text-sm text-slate-300 italic mt-2">Envie uma pergunta via transmissão para começar a triagem.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
