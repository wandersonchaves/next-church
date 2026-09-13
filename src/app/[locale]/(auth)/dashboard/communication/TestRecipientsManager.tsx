'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  Phone,
  SendHorizontal,
  Sparkles,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react';
import * as React from 'react';
import {
  getTestMembersAction,
  registerTestMemberAction,
  removeTestMemberTagAction,
  testWhatsAppMessageAction,
} from './actions';

type TestMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  kidsNotes: string | null;
  currentStep: string;
  createdAt: Date;
};

type DiagnosticResult = {
  success: boolean;
  targetPhone: string;
  latencyMs?: number;
  externalId?: string;
  error?: string;
};

const DEFAULT_ADMIN_PHONE = '86995206925';

export function TestRecipientsManager(props: {
  currentMessage: string;
  onSelectTestTagAction: () => void;
}) {
  const [testMembers, setTestMembers] = React.useState<TestMember[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [testingPhone, setTestingPhone] = React.useState<string | null>(null);
  const [diagnostic, setDiagnostic] = React.useState<DiagnosticResult | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newFirstName, setNewFirstName] = React.useState('');
  const [newLastName, setNewLastName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchMembers = async () => {
    setLoadingList(true);
    const res = await getTestMembersAction();
    if (res.success && res.data) {
      setTestMembers(res.data as TestMember[]);
    }
    setLoadingList(false);
  };

  React.useEffect(() => {
    fetchMembers();
  }, []);

  const hasAdminRegistered = testMembers.some((m) => {
    const raw = (m.phone || '').replace(/\D/g, '');
    return raw.includes('95206925');
  });

  const handleRegisterDefaultAdmin = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    const res = await registerTestMemberAction({
      firstName: 'Wanderson',
      lastName: 'Chaves (Teste PRD)',
      phone: DEFAULT_ADMIN_PHONE,
    });
    if (res.success) {
      await fetchMembers();
    } else {
      setErrorMessage(res.error || 'Erro ao registrar número padrão.');
    }
    setActionLoading(false);
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newPhone) {
      setErrorMessage('Informe pelo menos o nome e o WhatsApp.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    const res = await registerTestMemberAction({
      firstName: newFirstName,
      lastName: newLastName || 'Teste PRD',
      phone: newPhone,
    });

    if (res.success) {
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setShowAddForm(false);
      await fetchMembers();
    } else {
      setErrorMessage(res.error || 'Erro ao cadastrar membro de teste.');
    }
    setActionLoading(false);
  };

  const handleRemoveTag = async (memberId: string) => {
    setActionLoading(true);
    const res = await removeTestMemberTagAction(memberId);
    if (res.success) {
      await fetchMembers();
    }
    setActionLoading(false);
  };

  const handleImmediateTest = async (phone: string, name: string) => {
    setTestingPhone(phone);
    setDiagnostic(null);
    setErrorMessage(null);

    const testText = props.currentMessage
      ? props.currentMessage.replace(/\{name\}/g, name)
      : `🧪 Teste de Conexão NextChurch (PRD)\nDestinatário: ${name}\nHorário: ${new Date().toLocaleTimeString('pt-BR')}`;

    const res = await testWhatsAppMessageAction({
      phone,
      message: testText,
    });

    setDiagnostic({
      success: Boolean(res.success),
      targetPhone: phone,
      latencyMs: res.latencyMs,
      externalId: res.externalId,
      error: res.error,
    });

    setTestingPhone(null);
  };

  return (
    <div className="rounded-[2.5rem] border border-amber-200 bg-linear-to-b from-amber-50/50 via-white to-white p-6 shadow-xl lg:p-8">
      {/* HEADER DO CARD */}
      <div className="flex flex-col gap-4 border-b border-amber-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-amber-500 p-3 text-white shadow-lg shadow-amber-200">
            <FlaskConical size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-widest text-slate-900 uppercase">
                Ambiente de Homologação em PRD
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-amber-800 uppercase">
                Tag TESTE_PRD
              </span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              Cadastre e gerencie os destinatários que receberão disparos de teste em produção com total isolamento.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasAdminRegistered && (
            <button
              type="button"
              onClick={handleRegisterDefaultAdmin}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-[10px] font-black tracking-widest text-white uppercase shadow-md shadow-amber-200 transition-all hover:scale-[1.02] hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Cadastrar meu número (86 99520-6925)
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black tracking-widest text-slate-700 uppercase shadow-xs transition-all hover:bg-slate-50"
          >
            <UserPlus size={14} className="text-amber-600" />
            {showAddForm ? 'Fechar Formulário' : 'Novo Contato'}
          </button>

          <button
            type="button"
            onClick={props.onSelectTestTagAction}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black tracking-widest text-white uppercase shadow-md shadow-slate-200 transition-all hover:scale-[1.02] hover:bg-slate-800"
            title="Seleciona a tag TESTE_PRD no painel de Broadcast"
          >
            <SendHorizontal size={14} className="text-amber-400" />
            Filtrar no Broadcast
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO EXPANSÍVEL */}
      {showAddForm && (
        <form onSubmit={handleAddNewMember} className="mt-6 space-y-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
          <h4 className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-900 uppercase">
            <UserPlus size={14} />
            {' '}
            Cadastrar Destinatário de Teste
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Primeiro nome (ex: Wanderson)"
              value={newFirstName}
              onChange={e => setNewFirstName(e.target.value)}
              className="rounded-xl border-none bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              required
            />
            <input
              type="text"
              placeholder="Sobrenome (opcional)"
              value={newLastName}
              onChange={e => setNewLastName(e.target.value)}
              className="rounded-xl border-none bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <input
              type="text"
              placeholder="WhatsApp com DDD (ex: 86995206925)"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="rounded-xl border-none bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 uppercase hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-amber-600 px-6 py-2 text-[10px] font-black tracking-widest text-white uppercase hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Membro de Teste'}
            </button>
          </div>
        </form>
      )}

      {/* RESULTADO DIAGNÓSTICO DO DISPARO */}
      {diagnostic && (
        <div
          className={`mt-6 flex flex-col justify-between gap-4 rounded-3xl border p-5 transition-all duration-300 sm:flex-row sm:items-center ${diagnostic.success
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
            : 'border-rose-200 bg-rose-50/70 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {diagnostic.success
              ? (
                  <div className="rounded-2xl bg-emerald-500 p-2 text-white">
                    <CheckCircle2 size={18} />
                  </div>
                )
              : (
                  <div className="rounded-2xl bg-rose-500 p-2 text-white">
                    <AlertCircle size={18} />
                  </div>
                )}
            <div>
              <p className="text-xs font-black tracking-wider uppercase">
                {diagnostic.success ? 'Disparo de Teste Realizado com Sucesso!' : 'Falha no Disparo de Teste'}
              </p>
              <p className="text-[11px] font-medium opacity-80">
                Destinatário:
                {' '}
                <span className="font-bold">{diagnostic.targetPhone}</span>
                {diagnostic.externalId && ` • ID: ${diagnostic.externalId}`}
                {diagnostic.error && ` • Erro: ${diagnostic.error}`}
              </p>
            </div>
          </div>

          {diagnostic.latencyMs !== undefined && (
            <div className="flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 text-[10px] font-black tracking-wider uppercase shadow-xs">
              <Clock size={12} className="text-slate-400" />
              <span>
                Latência:
                {diagnostic.latencyMs}
                ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* LISTA DE MEMBROS DE TESTE */}
      <div className="mt-6">
        {loadingList
          ? (
              <div className="flex items-center justify-center gap-2 p-8 text-slate-400">
                <Loader2 size={16} className="animate-spin text-amber-500" />
                <span className="text-xs font-bold tracking-wider uppercase">Carregando membros de teste...</span>
              </div>
            )
          : testMembers.length === 0
            ? (
                <div className="space-y-3 rounded-3xl border border-dashed border-amber-300 bg-amber-50/30 p-8 text-center">
                  <p className="text-xs font-black tracking-wider text-amber-900 uppercase">
                    Nenhum membro marcado com a tag TESTE_PRD
                  </p>
                  <p className="mx-auto max-w-md text-[11px] font-medium text-slate-500">
                    Para testar disparos em produção sem impactar os membros reais, clique no botão acima para cadastrar seu número (
                    {DEFAULT_ADMIN_PHONE}
                    ).
                  </p>
                  <button
                    type="button"
                    onClick={handleRegisterDefaultAdmin}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-amber-200 transition-all hover:scale-[1.02] hover:bg-amber-700"
                  >
                    <Sparkles size={14} />
                    Ativar Meu Número para Testes (86 99520-6925)
                  </button>
                </div>
              )
            : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {testMembers.map((member) => {
                    const isDefaultNumber = (member.phone || '').replace(/\D/g, '').includes('95206925');
                    const isTesting = testingPhone === member.phone;

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="truncate text-xs font-black text-slate-900 uppercase">
                              {member.firstName}
                              {' '}
                              {member.lastName}
                            </h4>
                            {isDefaultNumber && (
                              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[8px] font-black tracking-wider text-indigo-600 uppercase">
                                Seu Número
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Phone size={12} className="text-slate-400" />
                            <span>{member.phone || 'Sem telefone'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
                          <button
                            type="button"
                            onClick={() => member.phone && handleImmediateTest(member.phone, member.firstName)}
                            disabled={isTesting || !member.phone}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-[9px] font-black tracking-wider text-amber-700 uppercase transition-all hover:bg-amber-500/20 disabled:opacity-50"
                            title="Envia uma mensagem de teste imediatamente para este número"
                          >
                            {isTesting
                              ? (
                                  <Loader2 size={12} className="animate-spin" />
                                )
                              : (
                                  <Zap size={12} className="text-amber-600" />
                                )}
                            <span>{isTesting ? 'Enviando...' : 'Disparo Rápido'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveTag(member.id)}
                            disabled={actionLoading}
                            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                            title="Remover tag de teste deste integrante"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
      </div>
    </div>
  );
}
