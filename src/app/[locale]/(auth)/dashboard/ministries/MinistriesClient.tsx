'use client';

import { ArrowRight, Briefcase, Plus, Settings, User } from 'lucide-react';
import * as React from 'react';
import { MinistryForm } from '@/components/Dashboard/MinistryForm';
import { Link } from '@/libs/I18nNavigation';

type MinistryData = {
  id: string;
  name: string;
  description: string | null;
  leaderName: string | null;
  leaderId?: string | null;
};

type MemberData = {
  id: string;
  firstName: string;
  lastName: string;
};

type MinistriesClientProps = {
  initialMinistries: MinistryData[];
  members: MemberData[];
};

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
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 font-sans lg:p-10">

      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl bg-indigo-600 p-4 text-white shadow-xl shadow-indigo-100">
            <Briefcase size={28} />
          </div>
          <div>
            <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">Gestão Ministerial</h1>
            <p className="mt-1.5 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Sectores e Equipes de Trabalho</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-indigo-600 active:scale-95"
        >
          <Plus size={18} />
          {' '}
          Novo Ministério
        </button>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {initialMinistries.map(m => (
          <div key={m.id} className="group flex flex-col justify-between rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1">
            <div>
              <div className="mb-6 flex items-start justify-between">
                <div className="rounded-2xl bg-slate-50 p-3 transition-colors group-hover:bg-indigo-50">
                  <Briefcase size={24} className="text-slate-400 group-hover:text-indigo-600" />
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(m)}
                  className="rounded-xl p-2 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-900"
                >
                  <Settings size={18} />
                </button>
              </div>

              <h3 className="mb-2 text-xl font-black tracking-tight text-slate-800 uppercase">{m.name}</h3>
              <p className="mb-6 line-clamp-2 text-sm leading-relaxed font-medium text-slate-500">
                {m.description || 'Setor ministerial focado na expansão do Reino e consolidação da visão.'}
              </p>
            </div>

            <div className="space-y-4 border-t border-slate-50 pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 shadow-inner"><User size={14} /></div>
                <div>
                  <p className="text-[9px] leading-none font-black tracking-widest text-slate-400 uppercase">Liderança</p>
                  <p className="text-sm font-bold text-slate-700">{m.leaderName || 'Aguardando designação'}</p>
                </div>
              </div>

              <Link
                href={`/dashboard/ministries/${m.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-[10px] font-black tracking-widest text-slate-600 uppercase shadow-sm transition-all hover:bg-slate-900 hover:text-white"
              >
                Gerenciar Setor
                {' '}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}

        {initialMinistries.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-slate-100 bg-white px-6 py-40 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
              <Briefcase size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase">Rede Ministerial Vazia</h3>
            <p className="mt-2 max-w-xs text-sm font-medium text-slate-400">Crie seus primeiros setores para organizar os ministérios da sua igreja.</p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <MinistryForm
          onCloseAction={handleClose}
          onSuccessAction={() => {
            handleClose();
            window.location.reload();
          }}
          members={members}
          initialData={editingMinistry
            ? {
                id: editingMinistry.id,
                name: editingMinistry.name,
                description: editingMinistry.description || '',
                leaderId: editingMinistry.leaderId || '',
              }
            : undefined}
        />
      )}
    </div>
  );
}
