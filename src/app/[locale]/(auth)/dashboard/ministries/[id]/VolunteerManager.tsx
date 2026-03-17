'use client';

import * as React from 'react';
import { Search, UserPlus, Check, X, Loader2, Trash2 } from 'lucide-react';
import { linkMemberToMinistryAction, unlinkMemberFromMinistryAction } from '../actions';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
}

export default function VolunteerManager({
  ministryId,
  allMembers,
  initialVolunteers
}: {
  ministryId: string,
  allMembers: Member[],
  initialVolunteers: Volunteer[]
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [role, setRole] = React.useState('VOLUNTÁRIO');
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [isLinking, setIsLinking] = React.useState(false);
  const [volunteers, setVolunteers] = React.useState(initialVolunteers);

  const filteredMembers = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];
    return allMembers.filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(term) &&
      !volunteers.some(v => v.id === m.id)
    ).slice(0, 5);
  }, [searchTerm, allMembers, volunteers]);

  const handleLink = async () => {
    if (!selectedMemberId) return;
    setIsLinking(true);
    const res = await linkMemberToMinistryAction(selectedMemberId, ministryId, role);
    if (res.success) {
      window.location.reload(); // Recarrega para sincronizar estado do servidor
    } else {
      alert(res.error);
      setIsLinking(false);
    }
  };

  const handleUnlink = async (memberId: string) => {
    if (!confirm("Remover este membro do ministério?")) return;
    const res = await unlinkMemberFromMinistryAction(memberId, ministryId);
    if (res.success) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-10">

      {/* SEÇÃO DE ADICIONAR */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><UserPlus size={18} /></div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Escalar Voluntário</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-4 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisar membro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
              />
            </div>

            {filteredMembers.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMemberId(m.id); setSearchTerm(`${m.firstName} ${m.lastName}`); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-bold flex justify-between items-center"
                  >
                    {m.firstName} {m.lastName}
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
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5"
          />

          <button
            onClick={handleLink}
            disabled={!selectedMemberId || isLinking}
            className="w-full bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLinking ? <Loader2 className="animate-spin" size={16} /> : "Adicionar à Equipe"}
          </button>
        </div>
      </section>

      {/* LISTA DE EQUIPE */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic flex items-center gap-3">
          Integrantes Ativos ({volunteers.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {volunteers.map((v) => (
            <div key={v.id} className="bg-white p-6 rounded-4xl border border-slate-100 shadow-md flex items-center justify-between group hover:border-red-100 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black shrink-0">
                  {v.firstName[0]}{v.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{v.firstName} {v.lastName}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{v.role || 'Voluntário'}</p>
                </div>
              </div>

              <button
                onClick={() => handleUnlink(v.id)}
                className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {volunteers.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest italic">Nenhum voluntário escalado ainda.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
