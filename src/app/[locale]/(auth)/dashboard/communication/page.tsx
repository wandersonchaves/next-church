'use client';

import { Filter, Info, Loader2, Send, MessageSquare, CheckCircle2, XCircle, MessageCircle, Users, AlertCircle, RefreshCw, Smartphone, Key } from 'lucide-react';
import * as React from 'react';
import { Alert } from '@/components/Dashboard/Alert';
import { sendBroadcastAction, syncWebhookAction, getWhatsAppStatusAction, getRecipientCountAction, getQRCodeAction, connectInstanceAction, pairInstanceAction } from './actions';
import Link from 'next/link';
import { useLocale } from 'next-intl';

const SAFETY_LIMIT = 100;

export default function CommunicationPage() {
  const locale = useLocale();
  const [message, setMessage] = React.useState('');
  const [step, setStep] = React.useState('');
  const [generation, setGeneration] = React.useState('');
  const [tag, setTag] = React.useState('');
  const [recipientCount, setRecipientCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [status, setStatus] = React.useState<{ connected: boolean; loggedIn?: boolean; name?: string } | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [pairingCode, setPairingCode] = React.useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [qrLoading, setQrLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Busca o status ao carregar
  React.useEffect(() => {
    async function fetchStatus() {
      const res = await getWhatsAppStatusAction();
      if (res.success && res.status) {
        setStatus({
          connected: res.status.connected,
          loggedIn: res.status.loggedIn,
          name: res.status.name as string | undefined
        });

        // Se estiver conectado mas não logado, tenta buscar o QR Code se não tivermos um
        if (res.status.connected && !res.status.loggedIn && !qrCode && !pairingCode) {
          handleFetchQR();
        }
      }
    }
    fetchStatus();
    // Refresh a cada 30 segundos se estiver desconectado
    const interval = setInterval(fetchStatus, status?.loggedIn ? 60000 : 30000);
    return () => clearInterval(interval);
  }, [status?.loggedIn, qrCode, pairingCode]);

  async function handleFetchQR() {
    setQrLoading(true);
    setPairingCode(null);
    const res = await getQRCodeAction();
    if (res.success && res.data) {
      setQrCode(res.data);
    }
    setQrLoading(false);
  }

  async function handleConnect() {
    setQrLoading(true);
    setError(null);
    setQrCode(null);
    setPairingCode(null);

    const res = await connectInstanceAction();
    if (res.success) {
      // Se a conexão já trouxe o QR, usamos ele
      if (res.data) {
        setQrCode(res.data);
        setQrLoading(false);
      } else {
        // Senão, fazemos polling por 10 segundos
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const qrRes = await getQRCodeAction();
          if (qrRes.success && qrRes.data) {
            setQrCode(qrRes.data);
            clearInterval(poll);
            setQrLoading(false);
          }
          if (attempts >= 5) {
            clearInterval(poll);
            setQrLoading(false);
            if (!qrCode) setError("QR Code demorou muito para gerar. Tente atualizar.");
          }
        }, 2000);
      }
    } else {
      setError("Falha ao iniciar conexão da instância.");
      setQrLoading(false);
    }
  }

  async function handlePair() {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert("Digite um número válido com DDD (ex: 86995206925)");
      return;
    }
    setQrLoading(true);
    setQrCode(null);
    setPairingCode(null);
    
    const res = await pairInstanceAction(phoneNumber);
    if (res.success && res.code) {
      setPairingCode(res.code);
    } else {
      setError("Falha ao gerar código de pareamento. Verifique se o número está correto.");
    }
    setQrLoading(false);
  }

  // Busca estimativa de destinatários quando os filtros mudam
  React.useEffect(() => {
    async function updateCount() {
      const res = await getRecipientCountAction({
        currentStep: step || null,
        generationSlot: generation || null,
        tag: tag || null,
      });
      if (res.success) {
        setRecipientCount(res.count);
      }
    }
    updateCount();
  }, [step, generation, tag]);

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
        tag: tag || null,
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
              href={`/${locale}/dashboard/communication/responses`}
              className="flex items-center gap-2 rounded-2xl bg-indigo-100 px-6 py-3 text-[10px] font-black tracking-widest text-indigo-600 uppercase transition-all hover:bg-indigo-200"
            >
              <MessageCircle size={16} />
              Interações
            </Link>

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

        {status && (!status.connected || !status.loggedIn) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Alert
                type="warning"
                title="Conexão Requerida"
                message={!status.connected 
                  ? "Sua instância do WhatsApp está desconectada do servidor Evolution. Clique em 'Conectar Instância' para iniciar o motor de conexão."
                  : "Sua instância está online, mas você precisa realizar o login. Escaneie o QR Code ao lado ou use o Código de Pareamento."
                }
                className="border-rose-200 bg-rose-50 text-rose-800"
              />
              
              {!status.loggedIn && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Key size={16} className="text-indigo-600" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Entrar com Código de Pareamento</h4>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input 
                      type="text" 
                      placeholder="Ex: 5586995206925"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className="flex-1 rounded-xl border-none bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5"
                    />
                    <button
                      onClick={handlePair}
                      disabled={qrLoading || !phoneNumber}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black tracking-widest text-white uppercase transition-all hover:bg-slate-800 disabled:opacity-50"
                    >
                      {qrLoading && pairingCode ? <Loader2 className="animate-spin" size={14} /> : "Gerar Código"}
                    </button>
                  </div>
                  
                  {pairingCode && (
                    <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Seu Código de 8 dígitos</p>
                      <p className="text-2xl font-black tracking-[0.3em] text-indigo-600 my-1">{pairingCode}</p>
                      <p className="text-[10px] font-medium text-indigo-400 leading-tight">No WhatsApp do seu celular, vá em: <br/> Aparelhos Conectados {'>'} Conectar com número de telefone.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col items-center justify-center gap-6 text-center min-h-[350px]">
              {!status.connected ? (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <Smartphone size={32} />
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={qrLoading}
                    className="flex items-center gap-3 rounded-2xl bg-indigo-600 px-10 py-5 font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {qrLoading ? <Loader2 className="animate-spin" size={20} /> : <Smartphone size={20} />}
                    Conectar Instância
                  </button>
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Isso iniciará o processo de boot. <br/> Aguarde alguns segundos após clicar.</p>
                </div>
              ) : (
                <>
                  <div className="relative h-56 w-56 overflow-hidden rounded-[2rem] bg-slate-50 flex items-center justify-center border-4 border-white shadow-inner">
                    {qrLoading && !qrCode ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Gerando QR...</p>
                      </div>
                    ) : qrCode ? (
                      <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="p-6">
                        <XCircle size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">QR Code expirado ou indisponível</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleFetchQR}
                      disabled={qrLoading}
                      className="flex items-center justify-center gap-2 w-full text-[10px] font-black tracking-widest text-indigo-600 uppercase hover:underline disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
                      Atualizar QR Code
                    </button>
                    <p className="text-[9px] font-medium text-slate-400 uppercase italic">Expira em 40 segundos</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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

              {recipientCount !== null && recipientCount > SAFETY_LIMIT && (
                <div className="mt-6">
                  <Alert
                    type="warning"
                    title="Meta: Protocolo de Aquecimento"
                    message={`Números novos devem começar enviando para menos de ${SAFETY_LIMIT} contatos por dia. O envio para ${recipientCount} pessoas agora pode acionar filtros de SPAM. Tente segmentar o envio ou aguardar interações de resposta antes de prosseguir.`}
                  />
                </div>
              )}

              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase italic">Processamento Individual via Fila</p>
                  {recipientCount !== null && (
                    <div className={`flex items-center gap-1.5 ${recipientCount > SAFETY_LIMIT ? 'text-rose-600' : 'text-indigo-600'}`}>
                      {recipientCount > SAFETY_LIMIT ? <AlertCircle size={12} /> : <Users size={12} />}
                      <span className="text-[10px] font-black tracking-widest uppercase">
                        Estimativa: {recipientCount} {recipientCount === 1 ? 'destinatário' : 'destinatários'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={loading || !message || recipientCount === 0}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl px-12 py-4 font-black tracking-widest text-white uppercase shadow-xl transition-all sm:w-auto ${loading || recipientCount === 0 ? 'bg-slate-400' : 'bg-indigo-600 shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'}`}
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
                    {Array.from({ length: 13 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        F
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tagFilter" className="ml-2 text-[9px] font-black tracking-widest text-slate-400 uppercase">Tag / Evento</label>
                  <select value={tag} onChange={e => setTag(e.target.value)} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5">
                    <option value="">Nenhuma Tag</option>
                    <option value="BATISMO_2026">Batismo 2026</option>
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
