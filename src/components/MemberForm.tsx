'use client';

import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Award, Calendar, Check, ChevronDown, Loader2, Phone, Save, Search, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { createMemberAction, deleteMemberAction, updateMemberAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { MemberDomain } from '@/utils/MemberDomain';
import { type MemberInput, MemberSchema } from '@/validations/MemberValidation';

const EMPTY_LEADERS: {
  id: string;
  firstName: string;
  lastName: string;
  level: number;
  generationSlot: number | null;
}[] = [];

type MemberFormLeader = {
  id: string;
  firstName: string;
  lastName: string;
  level: number;
  generationSlot: number | null;
};

export const MemberForm = (props: {
  leaders?: MemberFormLeader[];
  initialData?: MemberInput & { id: string };
  onSubmitCustomAction?: (data: MemberInput) => Promise<{ success?: boolean; error?: string }>;
  isPublic?: boolean;
}) => {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const leaders = props.leaders ?? EMPTY_LEADERS;
  const isEditMode = !!props.initialData;

  const { register, handleSubmit, watch, control, setValue, formState: { isSubmitting } } = useForm<MemberInput>({
    resolver: zodResolver(MemberSchema),
    defaultValues: props.initialData
      ? {
          ...props.initialData,
          birthDate: props.initialData.birthDate ? new Date(props.initialData.birthDate).toISOString().split('T')[0] : '',
          generationSlot: props.initialData.generationSlot?.toString() || '',
          kidsNotes: props.initialData.kidsNotes || '',
        }
      : {
          gender: 'M',
          currentStep: 'DECISION',
          birthDate: '',
          phone: '',
          email: '',
          leaderId: '',
          generationSlot: '',
          isBaptized: false,
          kidsNotes: '',
        },
  });

  const leaderId = watch('leaderId');

  const filteredLeaders = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return leaders.slice(0, 10);
    }
    return leaders.filter(l =>
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(term),
    );
  }, [searchTerm, leaders]);

  const selectedLeader = React.useMemo(() =>
    leaders.find(l => l.id === leaderId), [leaderId, leaders]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const birthDateValue = watch('birthDate');
  const kidsClass = React.useMemo(() => {
    if (!birthDateValue) {
      return null;
    }
    try {
      return MemberDomain.getKidsClass(new Date(birthDateValue));
    } catch {
      return null;
    }
  }, [birthDateValue]);

  const onSubmit: SubmitHandler<MemberInput> = async (data) => {
    setServerError(null);

    let result;
    if (props.onSubmitCustomAction) {
      result = await props.onSubmitCustomAction(data);
    } else {
      result = isEditMode && props.initialData
        ? await updateMemberAction(props.initialData.id, data)
        : await createMemberAction(data);
    }

    if ('success' in result && result.success) {
      if (props.isPublic) {
        setIsSuccess(true);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else if ('error' in result) {
      setServerError(result.error ?? 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!props.initialData?.id) {
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    const result = await deleteMemberAction(props.initialData.id);
    if ('success' in result && result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setServerError('Falha ao excluir.');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-4xl space-y-6 rounded-[3rem] border border-slate-200 bg-white p-12 text-center shadow-2xl transition-all duration-500">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic">CADASTRO REALIZADO!</h2>
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Sua jornada na visão G12 começou. Em breve entraremos em contato.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative max-w-4xl space-y-10 rounded-[3rem] border border-slate-200 bg-white p-8 shadow-2xl md:p-12">

      <header className="flex items-end justify-between border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
            {props.isPublic ? 'Ficha de Cadastro' : (isEditMode ? 'Editar Ficha' : 'Novo Integrante')}
          </h2>
          <p className="mt-3 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase italic">
            {props.isPublic ? 'Seja bem-vindo à família' : 'Linhagem e Gestão de Gerações'}
          </p>
        </div>
        {(isSubmitting || isDeleting) && <Loader2 className="animate-spin text-blue-600" size={32} />}
      </header>

      {serverError && <div className="rounded-3xl border-2 border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">{serverError}</div>}

      <div className="space-y-6">
        <h3 className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-600 uppercase">
          <User size={14} />
          {' '}
          Dados Identitários
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="ml-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Primeiro Nome</label>
            <input id="firstName" {...register('firstName')} className="w-full rounded-4xl border-2 border-slate-50 bg-slate-50/30 px-8 py-5 font-bold text-slate-700 outline-none focus:border-blue-500/20 focus:ring-4" />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="ml-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Sobrenome</label>
            <input id="lastName" {...register('lastName')} className="w-full rounded-4xl border-2 border-slate-50 bg-slate-50/30 px-8 py-5 font-bold text-slate-700 outline-none focus:border-blue-500/20 focus:ring-4" />
          </div>
        </div>
      </div>

      <div className="relative space-y-8 overflow-visible rounded-[3rem] bg-slate-900 p-8 shadow-2xl md:p-10">
        <h3 className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase">
          <Award size={14} />
          {' '}
          {props.isPublic ? 'Conexão na Igreja' : 'Posicionamento na Visão G12'}
        </h3>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="relative space-y-2" ref={dropdownRef}>
            <label htmlFor="leaderSearch" className="ml-4 block text-center text-[10px] font-black tracking-widest text-slate-500 uppercase italic md:text-left">Líder Direto</label>
            <div className="relative">
              <Search size={18} className="absolute top-5 left-6 text-slate-500" />
              <input
                id="leaderSearch"
                type="text"
                placeholder={selectedLeader ? `${selectedLeader.firstName} ${selectedLeader.lastName}` : 'Pesquisar líder...'}
                value={searchTerm}
                autoComplete="off"
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                className="w-full rounded-4xl border-none bg-white py-5 pr-6 pl-16 font-bold text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/20"
              />
            </div>

            {isOpen && (
              <div className="absolute z-50 mt-3 max-h-80 w-full overflow-y-auto rounded-4xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-200">
                {!props.isPublic && (
                  <button
                    type="button"
                    onMouseDown={() => {
                      setValue('leaderId', '');
                      setSearchTerm('');
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between border-b border-slate-50 px-8 py-5 text-left text-[10px] font-black uppercase ${!leaderId ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    ⭐ Liderança Raiz (Pastor)
                    {' '}
                    {!leaderId && <Check size={16} />}
                  </button>
                )}

                {filteredLeaders.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onMouseDown={() => {
                      setValue('leaderId', l.id);
                      setSearchTerm(`${l.firstName} ${l.lastName}`);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between border-b border-slate-50 px-8 py-5 text-left text-sm font-bold transition-colors ${leaderId === l.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="flex flex-col">
                      <span className="leading-none">
                        {l.firstName}
                        {' '}
                        {l.lastName}
                      </span>
                      <span className="mt-1.5 text-[9px] font-black tracking-widest text-slate-300 uppercase">{l.generationSlot ? `Geração F${l.generationSlot}` : 'Geração ?'}</span>
                    </div>
                    {leaderId === l.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!props.isPublic && (
            <div className="space-y-2">
              <label htmlFor="generationSlot" className="ml-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Nível de Geração (F1 a F12)</label>
              <div className="relative">
                <ChevronDown size={18} className="pointer-events-none absolute top-5 right-6 text-blue-400" />
                <select id="generationSlot" {...register('generationSlot')} className="h-16 w-full cursor-pointer appearance-none rounded-4xl border-none bg-white px-8 py-5 font-black text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/20">
                  <option value="">⏳ AGUARDANDO POSIÇÃO</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`${i + 1}`}>{`GERAÇÃO F${i + 1}`}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!props.isPublic && (
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="kidsNotes" className="ml-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">Tag / Evento Especial</label>
              <div className="relative">
                <ChevronDown size={18} className="pointer-events-none absolute top-5 right-6 text-blue-400" />
                <select id="kidsNotes" {...register('kidsNotes')} className="h-16 w-full cursor-pointer appearance-none rounded-4xl border-none bg-white px-8 py-5 font-black text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/20">
                  <option value="">NENHUMA TAG</option>
                  <option value="TESTE_PRD">🧪 TESTE_PRD - AMBIENTE DE TESTE</option>
                  <option value="BATISMO_2026">🌊 BATISMO_2026 - CANDIDATO AO BATISMO</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="birthDate" className="ml-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            <Calendar size={14} className="text-blue-600" />
            {' '}
            Nascimento
          </label>
          <input id="birthDate" type="date" {...register('birthDate')} className="w-full rounded-4xl border-2 border-slate-50 bg-slate-50/30 px-8 py-5 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5" />
          {kidsClass && (
            <span className="ml-4 rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black tracking-tighter text-white uppercase">
              Trilha:
              {kidsClass}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="ml-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            <Phone size={14} className="text-blue-600" />
            {' '}
            WhatsApp
          </label>
          <Controller
            name="phone"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <PatternFormat
                {...field}
                id="phone"
                format="(##) #####-####"
                mask="_"
                value={value}
                onValueChange={values => onChange(values.value)}
                placeholder="(86) 99999-9999"
                className="w-full rounded-4xl border-2 border-slate-50 bg-slate-50/30 px-8 py-5 font-bold text-slate-700 shadow-sm outline-none"
              />
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-6 md:flex-row">
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className={`flex flex-1 items-center justify-center gap-4 rounded-[2.5rem] py-7 text-sm font-black tracking-[0.3em] text-white uppercase shadow-2xl transition-all ${isSubmitting ? 'bg-slate-400' : 'bg-linear-to-r from-blue-600 to-indigo-700 hover:scale-[1.02] active:scale-[0.98]'}`}
        >
          {isSubmitting
            ? <Loader2 className="animate-spin" />
            : (isEditMode
                ? (
                    <>
                      <Save size={20} />
                      {' '}
                      Salvar Alterações
                    </>
                  )
                : (props.isPublic ? 'Enviar Cadastro' : 'Cadastrar na Visão'))}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className={`flex items-center justify-center gap-2 rounded-[2.5rem] border-2 px-10 py-7 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${confirmDelete
              ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
              : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
            }`}
          >
            <Trash2 size={16} />
            {' '}
            {confirmDelete ? 'Confirmar Exclusão?' : 'Excluir Registro'}
          </button>
        )}
      </div>
    </form>
  );
};
