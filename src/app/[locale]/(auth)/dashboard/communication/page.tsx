'use client';

import { Filter, Info, Loader2, Send } from 'lucide-react';
import * as React from 'react';
import { Alert } from '@/components/Dashboard/Alert';
import { sendBroadcastAction } from './actions';

export default function CommunicationPage() {
  const [message, setMessage] = React.useState('');
  const [step, setStep] = React.useState('');
  const [generation, setGeneration] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSend() {
    if (!message) {
      return;
    }
    setLoading(true);
    setSuccess(false);
    setError(null);

    const res = await sendBroadcastAction({
      message,
      filters: {
        currentStep: step || null,
        generationSlot: generation || null,
      },
    });

    if (res.success) {
      setSuccess(true);
      setMessage('');
    } else {
      setError('Falha ao processar o envio. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans lg:p-8">
      <div className="mx-auto max-w-350 space-y-8">

        {/* HEADER UNIFICADO */}
        <header className="flex items-center gap-4 rounded-4xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100">
            <Send size={24} />
          </div>
          <div>
            <h1 className="text-xl leading-none font-black tracking-tight text-slate-900 uppercase">Hub de Comunicação</h1>
            <p className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Mensageria Estratégica</p>
          </div>
        </header>

        {/* CONTÊINER PRINCIPAL COM FLEX WRAP (Fase 4) */}
        <div className="flex flex-col gap-8 lg:flex-row">

          {/* EDITOR (Flex-grow para ocupar espaço principal) */}
          <div className="flex-1 space-y-6">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-sm font-black tracking-widest text-slate-800 uppercase">Nova Mensagem</h2>
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[9px] font-black text-blue-600 uppercase">
                  <Info size={12} />
                  {' '}
                  Use &#123;name&#125; para personalizar
                </div>
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Olá {name}! Como vai sua célula?"
                className="h-80 w-full resize-none rounded-4xl border-none bg-slate-50 p-6 text-lg font-medium text-slate-700 transition-all outline-none focus:ring-4 focus:ring-indigo-500/5"
              />

              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase italic">Processamento Individual via Fila</p>
                <button
                  onClick={handleSend}
                  disabled={loading || !message}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl px-12 py-4 font-black tracking-widest text-white uppercase shadow-xl transition-all sm:w-auto ${loading ? 'bg-slate-400' : 'bg-indigo-600 shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  Disparar
                </button>
              </div>
            </div>

            {success && (
              <Alert
                type="success"
                title="Broadcast Iniciado"
                message="As mensagens foram colocadas na fila do Inngest e serão enviadas respeitando o intervalo de segurança."
              />
            )}

            {error && (
              <Alert
                type="warning"
                title="Falha no Processo"
                message={error}
              />
            )}
          </div>

          {/* SIDEBAR: SEGMENTAÇÃO (Flex-basis fixo no desktop) */}
          <div className="w-full shrink-0 space-y-6 lg:w-96">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
              <h3 className="mb-8 flex items-center gap-2 border-b border-slate-50 pb-4 text-xs font-black tracking-widest text-slate-800 uppercase">
                <Filter size={16} className="text-indigo-600" />
                {' '}
                Segmentação
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="journeyStep" className="ml-2 text-[9px] font-black tracking-widest text-slate-400 uppercase">Etapa da Jornada</label>
                  <select value={step} onChange={e => setStep(e.target.value)} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5">
                    <option value="">Toda a Igreja</option>
                    {['DECISION', 'CELL', 'UNIVERSITY_OF_LIFE', 'ENCOUNTER', 'LEADERSHIP_TRAINING', 'RE_ENCOUNTER', 'SENDING'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="leaderGeneration" className="ml-2 text-[9px] font-black tracking-widest text-slate-400 uppercase">Geração do Líder</label>
                  <select value={generation} onChange={e => setGeneration(e.target.value)} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5">
                    <option value="">Todas as Linhagens</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        F
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dica de Throttling integrada ao fluxo (Fase 4) */}
              <Alert
                type="info"
                title="Throttling"
                message="Intervalo de 2s ativo para proteger seu número."
                className="mt-10 border-none p-4 shadow-none"
              />
            </div>

            {/* Dica do Tech Lead unificada */}
            <Alert
              type="tip"
              title="Dica Estratégica"
              message="Utilize variáveis dinâmicas para aumentar a taxa de resposta dos seus discípulos."
            />
          </div>

        </div>
      </div>
    </div>
  );
}
