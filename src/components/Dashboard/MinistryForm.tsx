'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMinistryAction, updateMinistryAction, deleteMinistryAction } from '@/app/[locale]/(auth)/dashboard/ministries/actions';
import { Briefcase, User, Search, Check, Loader2, X, Settings, Trash2 } from 'lucide-react';

const MinistrySchema = z.object({
  name: z.string().min(3, "Nome do ministério é obrigatório"),
  description: z.string().optional(),
  leaderId: z.string().optional().nullable().or(z.literal('')),
});

type MinistryInput = z.infer<typeof MinistrySchema>;

interface MinistryFormProps {
  onSuccess: () => void;
  onClose: () => void;
  members: { id: string, firstName: string, lastName: string }[];
  initialData?: MinistryInput & { id: string };
}

export const MinistryForm = ({ onSuccess, onClose, members, initialData }: MinistryFormProps) => {
  const isEditMode = !!initialData;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredMembers, setFilteredMembers] = React.useState(members);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<MinistryInput>({
    resolver: zodResolver(MinistrySchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      leaderId: initialData.leaderId || '',
    } : { name: '', description: '', leaderId: '' }
  });

  const leaderId = watch('leaderId');

  React.useEffect(() => {
    if (searchTerm.length > 1) {
      setFilteredMembers(members.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredMembers(members.slice(0, 5));
    }
  }, [searchTerm, members]);

  async function onSubmit(data: MinistryInput) {
    const res = isEditMode
      ? await updateMinistryAction(initialData.id, data)
      : await createMinistryAction(data);

    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
  }

  async function handleDelete() {
    if (!initialData?.id) return;
    if (!confirm("Excluir este ministério permanentemente? Os membros vinculados não serão excluídos, apenas o setor.")) return;

    setIsDeleting(true);
    const res = await deleteMinistryAction(initialData.id);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300 p-10 overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${isEditMode ? 'bg-indigo-600' : 'bg-emerald-600'} text-white rounded-2xl`}>
              {isEditMode ? <Settings size={20} /> : <Briefcase size={20} />}
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {isEditMode ? "Configurar Setor" : "Novo Ministério"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome do Setor</label>
            <input {...register('name')} className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 font-bold text-slate-700" placeholder="Ex: Louvor, Mídia, Kids" />
            {errors.name && <p className="text-xs text-red-500 font-bold ml-2">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Descrição</label>
            <textarea {...register('description')} className="w-full h-32 px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 font-medium text-slate-700 resize-none" placeholder="Propósito deste ministério..." />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-2">Liderança do Setor</label>
            <div className="relative group">
              <Search size={16} className="absolute left-4 top-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar líder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800"
              />
              <div className="mt-2 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                <button type="button" onMouseDown={() => { setValue('leaderId', ''); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase border-b border-slate-100/50 ${!leaderId ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:bg-white'}`}>
                  Nenhum Líder {!leaderId && <Check size={14} className="inline ml-2" />}
                </button>
                {filteredMembers.map(m => (
                  <button key={m.id} type="button" onMouseDown={() => { setValue('leaderId', m.id); setSearchTerm(`${m.firstName} ${m.lastName}`); }} className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between border-b border-slate-100/50 ${leaderId === m.id ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}>
                    {m.firstName} {m.lastName} {leaderId === m.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button type="submit" disabled={isSubmitting || isDeleting} className="w-full py-5 rounded-3xl text-white font-black uppercase tracking-widest shadow-xl bg-linear-to-r from-indigo-600 to-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {(isSubmitting || isDeleting) ? <Loader2 className="animate-spin" /> : (isEditMode ? "Salvar Alterações" : "Criar Ministério")}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="w-full py-4 text-[10px] font-black uppercase text-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Excluir Ministério
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
