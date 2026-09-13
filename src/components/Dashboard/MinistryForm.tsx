'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Check, Loader2, Search, Settings, Trash2, X } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createMinistryAction, deleteMinistryAction, updateMinistryAction } from '@/app/[locale]/(auth)/dashboard/ministries/actions';

const MinistrySchema = z.object({
  name: z.string().min(3, 'Nome do ministério é obrigatório'),
  description: z.string().optional(),
  leaderId: z.string().optional().nullable().or(z.literal('')),
});

type MinistryInput = z.infer<typeof MinistrySchema>;

export const MinistryForm = (props: {
  onSuccessAction: () => void;
  onCloseAction: () => void;
  members: { id: string; firstName: string; lastName: string }[];
  initialData?: MinistryInput & { id: string };
}) => {
  const isEditMode = !!props.initialData;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<MinistryInput>({
    resolver: zodResolver(MinistrySchema),
    defaultValues: props.initialData
      ? {
          name: props.initialData.name,
          description: props.initialData.description || '',
          leaderId: props.initialData.leaderId || '',
        }
      : { name: '', description: '', leaderId: '' },
  });

  const leaderId = watch('leaderId');

  const filteredMembers = searchTerm.length > 1
    ? props.members.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : props.members.slice(0, 5);

  const handleClose = () => {
    props.onCloseAction();
  };

  const handleSuccess = () => {
    props.onSuccessAction();
  };

  async function onSubmit(data: MinistryInput) {
    setFormError(null);
    const res = isEditMode
      ? await updateMinistryAction(props.initialData!.id, data)
      : await createMinistryAction(data);

    if (res.success) {
      handleSuccess();
    } else {
      setFormError(res.error || 'Falha ao salvar ministério');
    }
  }

  async function handleDelete() {
    if (!props.initialData?.id) {
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setFormError(null);
    const res = await deleteMinistryAction(props.initialData.id);
    if (res.success) {
      handleSuccess();
    } else {
      setFormError(res.error || 'Falha ao excluir ministério');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-10 shadow-2xl transition-all">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${isEditMode ? 'bg-indigo-600' : 'bg-emerald-600'} rounded-2xl text-white`}>
              {isEditMode ? <Settings size={20} /> : <Briefcase size={20} />}
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">
              {isEditMode ? 'Configurar Setor' : 'Novo Ministério'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-50"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-1.5">
            <label htmlFor="ministry-name" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Nome do Setor
            </label>
            <input
              id="ministry-name"
              {...register('name')}
              className="w-full rounded-2xl border-2 border-slate-100 px-6 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5"
              placeholder="Ex: Louvor, Mídia, Kids"
            />
            {errors.name && <p className="ml-2 text-xs font-bold text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ministry-description" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Descrição
            </label>
            <textarea
              id="ministry-description"
              {...register('description')}
              className="h-32 w-full resize-none rounded-2xl border-2 border-slate-100 px-6 py-4 font-medium text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5"
              placeholder="Propósito deste ministério..."
            />
          </div>

          <div className="space-y-4">
            <label htmlFor="ministry-leader-search" className="ml-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
              Liderança do Setor
            </label>
            <div className="group relative">
              <Search size={16} className="absolute top-4 left-4 text-slate-400" />
              <input
                id="ministry-leader-search"
                type="text"
                placeholder="Pesquisar líder..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-50 py-4 pr-4 pl-12 font-bold text-slate-800 shadow-xs outline-none focus:ring-4 focus:ring-blue-500/10"
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onMouseDown={() => {
                    setValue('leaderId', '');
                    setSearchTerm('');
                  }}
                  className={`w-full border-b border-slate-100/50 px-4 py-3 text-left text-[10px] font-black uppercase ${!leaderId ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:bg-white'}`}
                >
                  Nenhum Líder
                  {' '}
                  {!leaderId && <Check size={14} className="ml-2 inline" />}
                </button>
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => {
                      setValue('leaderId', m.id);
                      setSearchTerm(`${m.firstName} ${m.lastName}`);
                    }}
                    className={`flex w-full items-center justify-between border-b border-slate-100/50 px-4 py-3 text-left text-sm font-bold ${leaderId === m.id ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-white'}`}
                  >
                    {m.firstName}
                    {' '}
                    {m.lastName}
                    {' '}
                    {leaderId === m.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-linear-to-r from-indigo-600 to-blue-700 py-5 font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {(isSubmitting || isDeleting)
                ? <Loader2 className="animate-spin" />
                : (isEditMode ? 'Salvar Alterações' : 'Criar Ministério')}
            </button>

            {isEditMode && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black uppercase transition-colors ${confirmDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  <Trash2 size={14} />
                  {confirmDelete ? 'Confirmar Exclusão Permanente?' : 'Excluir Ministério'}
                </button>
                {confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
