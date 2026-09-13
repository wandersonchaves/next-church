import { auth } from '@clerk/nextjs/server';
import { Check, MessageCircle, ShieldAlert, User, Waves, X } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { markAsBaptizedAction, markAsInactiveAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { Link } from '@/libs/I18nNavigation';
import { NotificationService } from '@/libs/services/NotificationService';

export const dynamic = 'force-dynamic';

export default async function SurveyResponsesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  const responses = await NotificationService.getSurveyResponses(orgId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* HEADER */}
        <header className="flex flex-col items-start justify-between gap-4 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-600">
              <MessageCircle size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Respostas Interativas</h1>
              <p className="mt-1 text-xs font-bold tracking-widest text-slate-400 uppercase">Triagem de Pesquisas • TelePaz Filadélfia</p>
            </div>
          </div>
          <Link href="/dashboard/communication" className="rounded-xl bg-slate-100 px-6 py-2 text-[10px] font-black tracking-widest text-slate-600 uppercase transition-all hover:bg-slate-200">
            Voltar
          </Link>
        </header>

        {/* RESPONSES LIST */}
        <div className="space-y-6">
          {responses.map((res) => {
            const isYes = res.answer.toLowerCase().includes('sim');
            const isNo = res.answer.toLowerCase().includes('não') || res.answer.toLowerCase().includes('nao');

            return (
              <div key={res.id} className="group overflow-hidden rounded-4xl border border-slate-100 bg-white shadow-lg transition-all hover:border-indigo-200">
                <div className="flex flex-col lg:flex-row">

                  {/* MEMBER & CONTEXT */}
                  <div className="border-b border-slate-100 bg-slate-50/50 p-6 lg:w-1/3 lg:border-r lg:border-b-0">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-sm leading-none font-black text-slate-800">
                          {res.member ? `${res.member.firstName} ${res.member.lastName}` : 'Contato Desconhecido'}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">{res.member?.generationSlot ? `Geração F${res.member.generationSlot}` : 'Geração ?'}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 italic">
                      <p className="mb-1 text-[10px] font-bold text-slate-400 uppercase">Sua Pergunta:</p>
                      <p className="text-xs font-medium text-slate-500">
                        "
                        {res.question}
                        "
                      </p>
                    </div>
                  </div>

                  {/* ANSWER & ACTIONS */}
                  <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Resposta do Membro:</span>
                      <div className={`mt-2 rounded-2xl p-4 text-sm font-bold ${isYes ? 'bg-emerald-50 text-emerald-700' : isNo ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
                        {res.answer}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-4">
                      <p className="mr-2 w-full text-[10px] font-black tracking-widest text-slate-400 uppercase lg:w-auto">Ações Rápidas:</p>

                      <form action={async () => {
                        'use server';
                        await markAsBaptizedAction(res.member!.id, true);
                      }}
                      >
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black tracking-widest text-white uppercase shadow-sm transition-all hover:bg-emerald-600"
                        >
                          <Waves size={14} />
                          {' '}
                          Batizado
                        </button>
                      </form>

                      <form action={async () => {
                        'use server';
                        await markAsInactiveAction(res.member!.id);
                      }}
                      >
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black tracking-widest text-white uppercase shadow-sm transition-all hover:bg-red-600"
                        >
                          <ShieldAlert size={14} />
                          {' '}
                          Inativar
                        </button>
                      </form>

                      <Link href={`/dashboard/members/${res.member?.id}/edit`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black tracking-widest text-slate-600 uppercase transition-all hover:bg-slate-50">
                        <Check size={14} />
                        {' '}
                        Outros
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}

          {responses.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-white px-6 py-32 text-center">
              <X size={48} className="mb-4 text-slate-100" />
              <h3 className="text-lg font-black tracking-widest text-slate-400 uppercase">Nenhuma resposta interativa ainda</h3>
              <p className="mt-2 text-sm text-slate-300 italic">Envie uma pergunta via transmissão para começar a triagem.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
