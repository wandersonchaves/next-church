'use client';

import { Filter, Info, Loader2, Send, MessageSquare, CheckCircle2, XCircle } from 'lucide-react';
import * as React from 'react';
import { Alert } from '@/components/Dashboard/Alert';
import { sendBroadcastAction, syncWebhookAction, getWhatsAppStatusAction } from './actions';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function CommunicationPage() {
  const locale = useLocale();
  const [message, setMessage] = React.useState('');
  const [step, setStep] = React.useState('');
  const [generation, setGeneration] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [status, setStatus] = React.useState<{ connected: boolean; name?: string } | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Busca o status ao carregar
  React.useEffect(() => {
    async function fetchStatus() {
      const res = await getWhatsAppStatusAction();
      if (res.success && res.status) {
        setStatus({
          connected: res.status.connected,
          name: res.status.name as string | undefined
        });
      }
    }
    fetchStatus();
    // Refresh a cada 1 minuto
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleSync() {
    setSyncing(true);
    const res = await syncWebhookAction();
    if (res.success) {
      alert('Conexão sincronizada com sucesso! As mensagens agora devem chegar.');
    } else {
      setError(res.error || 'Erro ao sincronizar conexão.');
    }
    setSyncing(false);
  }

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
        <header className="flex items-center justify-between gap-4 rounded-4xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100">
              <Send size={24} />
            </div>
            <div>
              <h1 className="text-xl leading-none font-black tracking-tight text-slate-900 uppercase">Hub de Comunicação</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Mensageria Estratégica</p>
                {status && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${status.connected ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {status.connected ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {status.connected ? `Online: ${status.name || 'WhatsApp'}` : 'Desconectado'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href={`/${locale}/dashboard/communication/inbox`}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageSquare size={16} />
              Inbox
            </Link>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-black tracking-widest text-slate-600 uppercase transition-all hover:bg-slate-50 disabled:opacity-50"
              title="Sincronizar configuração de Webhook na Evolution"
            >
              <Loader2 className={syncing ? 'animate-spin' : ''} size={16} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Conexão'}
            </button>
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
                title="Modo Seguro Ativo"
                message="Throttling inteligente (8-20s) e pausas por lote automáticas para proteger seu número novo contra bloqueios."
                className="mt-10 border-none p-4 shadow-none"
              />
            </div>

            {/* Dica do Tech Lead unificada */}
            <Alert
              type="tip"
              title="Dica de Segurança"
              message="Para números novos, adicione 'Responda SAIR para não receber mais' ao final da mensagem. Isso reduz denúncias de spam."
            />
          </div>

        </div>
      </div>
    </div>
  );
}
