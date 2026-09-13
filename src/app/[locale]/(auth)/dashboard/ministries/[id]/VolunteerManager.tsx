'use client';

import { Check, Loader2, Search, Trash2, UserPlus } from 'lucide-react';
import * as React from 'react';
import { linkMemberToMinistryAction, unlinkMemberFromMinistryAction } from '../actions';

type Member = {
  id: string;
  firstName: string;
  lastName: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
};

export default function VolunteerManager(props: {
  ministryId: string;
  allMembers: Member[];
  initialVolunteers: Volunteer[];
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [role, setRole] = React.useState('VOLUNTÁRIO');
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [isLinking, setIsLinking] = React.useState(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const term = searchTerm.toLowerCase().trim();
  const filteredMembers = term
    ? props.allMembers.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(term)
        && !props.initialVolunteers.some(v => v.id === m.id),
      ).slice(0, 5)
    : [];

  const handleLink = async () => {
    if (!selectedMemberId) {
      return;
    }
    setIsLinking(true);
    setErrorMessage(null);
    const res = await linkMemberToMinistryAction(selectedMemberId, props.ministryId, role);
    if (res.success) {
      window.location.reload();
    } else {
      setErrorMessage(res.error || 'Falha ao vincular membro.');
      setIsLinking(false);
    }
  };

  const handleUnlink = async (memberId: string) => {
    if (confirmUnlinkId !== memberId) {
      setConfirmUnlinkId(memberId);
      return;
    }
    setErrorMessage(null);
    const res = await unlinkMemberFromMinistryAction(memberId, props.ministryId);
    if (res.success) {
      window.location.reload();
    } else {
      setErrorMessage(res.error || 'Falha ao remover voluntário.');
      setConfirmUnlinkId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* SEÇÃO DE ADICIONAR */}
      <section className="space-y-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-600"><UserPlus size={18} /></div>
          <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase italic">Escalar Voluntário</h3>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <div className="relative">
              <Search className="absolute top-4 left-4 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisar membro..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-none bg-slate-50 py-4 pr-4 pl-12 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
              />
            </div>

            {filteredMembers.length > 0 && (
              <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setSearchTerm(`${m.firstName} ${m.lastName}`);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold hover:bg-blue-50"
                  >
                    {m.firstName}
                    {' '}
                    {m.lastName}
                    {selectedMemberId === m.id && <Check size={14} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Função (ex: Vocal, Mídia...)"
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
          />

          <button
            type="button"
            onClick={handleLink}
            disabled={!selectedMemberId || isLinking}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[10px] font-black tracking-widest text-white uppercase shadow-lg transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50"
          >
            {isLinking ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar à Equipe'}
          </button>
        </div>
      </section>

      {/* LISTA DE EQUIPE */}
      <section className="space-y-6">
        <h3 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-800 uppercase italic">
          Integrantes Ativos (
          {props.initialVolunteers.length}
          )
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {props.initialVolunteers.map(v => (
            <div key={v.id} className="group flex items-center justify-between rounded-4xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:border-red-100">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 font-black text-slate-400">
                  {v.firstName[0]}
                  {v.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">
                    {v.firstName}
                    {' '}
                    {v.lastName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-black tracking-widest text-blue-600 uppercase">{v.role || 'Voluntário'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {confirmUnlinkId === v.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmUnlinkId(null)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleUnlink(v.id)}
                  className={`rounded-xl p-3 transition-all ${
                    confirmUnlinkId === v.id
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600'
                  }`}
                  title={confirmUnlinkId === v.id ? 'Confirmar remoção' : 'Remover'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {props.initialVolunteers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
              <p className="text-sm font-bold tracking-widest text-slate-400 uppercase italic">Nenhum voluntário escalado ainda.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
