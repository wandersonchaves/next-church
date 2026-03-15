'use client';

import { AlertTriangle, CheckCircle2, Filter, Info, Loader2, Send, Users } from 'lucide-react';
import * as React from 'react';
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
      setError('Falha ao processar o envio. Verifique a fila no Inngest.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen space-y-8 bg-[#F8FAFC] p-4 font-sans lg:p-10">
      <header className="flex items-center gap-4">
        <div className="rounded-2xl bg-indigo-600 p-3 shadow-lg shadow-indigo-200">
          <Send size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Hub de Comunicação</h1>
          <p className="mt-1 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Disparo de Mensagens em Massa via WhatsApp</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Editor de Mensagem */}
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">Escrever Mensagem</h2>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-600 uppercase">
                <Info size={12} />
                {' '}
                Use &#123;name&#125; para personalizar
              </div>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ex: Olá {name}! Temos um convite especial para você..."
              className="h-64 w-full resize-none rounded-4xl border-2 border-slate-100 bg-slate-50 p-6 font-medium text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5"
            />

            <div className="mt-8 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400 italic">As mensagens serão enviadas individualmente respeitando a linhagem.</p>
              <button
                onClick={handleSend}
                disabled={loading || !message}
                className={`flex items-center gap-3 rounded-2xl px-10 py-4 font-black tracking-widest text-white uppercase shadow-xl transition-all ${loading ? 'bg-slate-400' : 'bg-indigo-600 shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {loading ? 'Processando Fila...' : 'Disparar Broadcast'}
              </button>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-4 rounded-4xl border-2 border-emerald-100 bg-emerald-50 p-6 text-emerald-700">
              <CheckCircle2 size={32} />
              <div>
                <p className="text-lg font-black tracking-tight uppercase">Broadcast Iniciado!</p>
                <p className="text-sm font-medium opacity-80">As mensagens foram colocadas na fila do Inngest e serão enviadas em breve.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-4 rounded-4xl border-2 border-red-100 bg-red-50 p-6 text-red-700">
              <AlertTriangle size={32} />
              <div>
                <p className="text-lg font-black tracking-tight uppercase">Falha no Envio</p>
                <p className="text-sm font-medium opacity-80">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filtros de Segmentação */}
        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
            <h3 className="mb-8 flex items-center gap-2 text-sm font-black tracking-widest text-slate-800 uppercase">
              <Filter size={16} className="text-blue-600" />
              {' '}
              Segmentação
            </h3>

            <div className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="filterStep" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Filtrar por Etapa</label>
                <select
                  value={step}
                  onChange={e => setStep(e.target.value)}
                  className="w-full cursor-pointer rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">Todas as Etapas</option>
                  <option value="DECISION">Decisão</option>
                  <option value="CELL">Célula</option>
                  <option value="UNIVERSITY_OF_LIFE">Univ. da Vida</option>
                  <option value="ENCOUNTER">Encontro</option>
                  <option value="SENDING">Enviados</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="filterGeneration" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Filtrar por Geração (F1-F12)</label>
                <select
                  value={generation}
                  onChange={e => setGeneration(e.target.value)}
                  className="w-full cursor-pointer rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">Todas as Gerações</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Geração F
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50 p-6">
              <div className="flex items-start gap-3">
                <Users className="shrink-0 text-blue-600" size={20} />
                <p className="text-[11px] leading-relaxed font-medium text-blue-800">
                  O envio em massa utiliza
                  {' '}
                  <span className="font-black">Inteligência de Throttle</span>
                  {' '}
                  (intervalo de 2s) para proteger seu número contra bloqueios do WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
