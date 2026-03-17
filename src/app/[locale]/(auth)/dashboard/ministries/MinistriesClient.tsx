'use client';

import * as React from 'react';
import { Briefcase, Plus, User, ArrowRight, Settings } from 'lucide-react';
import { MinistryForm } from '@/components/Dashboard/MinistryForm';
import { Link } from '@/libs/I18nNavigation';

interface MinistryData {
  id: string;
  name: string;
  description: string | null;
  leaderName: string | null;
  leaderId?: string | null;
}

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
}

interface MinistriesClientProps {
  initialMinistries: MinistryData[];
  members: MemberData[];
}

export default function MinistriesClient({ initialMinistries, members }: MinistriesClientProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMinistry, setEditingMinistry] = React.useState<MinistryData | null>(null);

  const handleEdit = (m: MinistryData) => {
    setEditingMinistry(m);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingMinistry(null);
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen font-sans">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100">
            <Briefcase size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Gestão Ministerial</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Sectores e Equipes de Trabalho</p>
          </div>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
        >
          <Plus size={18} /> Novo Ministério
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {initialMinistries.map((m) => (
          <div key={m.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                  <Briefcase size={24} className="text-slate-400 group-hover:text-indigo-600" />
                </div>
                <button
                  onClick={() => handleEdit(m)}
                  className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <Settings size={18} />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">{m.name}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">
                {m.description || "Setor ministerial focado na expansão do Reino e consolidação da visão."}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-inner"><User size={14} /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Liderança</p>
                  <p className="text-sm font-bold text-slate-700">{m.leaderName || "Aguardando designação"}</p>
                </div>
              </div>

              <Link
                href={`/dashboard/ministries/${m.id}`}
                className="w-full py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                Gerenciar Setor <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}

        {initialMinistries.length === 0 && (
          <div className="col-span-full py-40 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
              <Briefcase size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase">Rede Ministerial Vazia</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2 font-medium">Crie seus primeiros setores para organizar os ministérios da sua igreja.</p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <MinistryForm
          onClose={handleClose}
          onSuccess={() => { handleClose(); window.location.reload(); }}
          members={members}
          initialData={editingMinistry ? {
            id: editingMinistry.id,
            name: editingMinistry.name,
            description: editingMinistry.description || '',
            leaderId: editingMinistry.leaderId || ''
          } : undefined}
        />
      )}
    </div>
  );
}
