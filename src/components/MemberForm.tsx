'use client';

import * as React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MemberSchema, type MemberInput } from '@/validations/MemberValidation';
import { createMemberAction, updateMemberAction, deleteMemberAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { MemberDomain } from '@/utils/MemberDomain';
import { useRouter } from 'next/navigation';
import { User, Calendar, Phone, Award, Loader2, Search, Check, ChevronDown, Save, Trash2 } from 'lucide-react';
import { PatternFormat } from 'react-number-format';

interface MemberFormProps {
  leaders: {
    id: string,
    firstName: string,
    lastName: string,
    level: number,
    generationSlot: number | null
  }[];
  initialData?: MemberInput & { id: string };
  onSubmitCustom?: (data: MemberInput) => Promise<{ success?: boolean; error?: string }>;
  isPublic?: boolean;
}

export const MemberForm = ({ leaders = [], initialData, onSubmitCustom, isPublic = false }: MemberFormProps) => {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isEditMode = !!initialData;

  const { register, handleSubmit, watch, control, setValue, formState: { isSubmitting } } = useForm<MemberInput>({
    resolver: zodResolver(MemberSchema),
    defaultValues: initialData ? {
      ...initialData,
      birthDate: initialData.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
      generationSlot: initialData.generationSlot?.toString() || '',
    } : {
      gender: 'M',
      currentStep: 'DECISION',
      birthDate: '',
      phone: '',
      email: '',
      leaderId: '',
      generationSlot: '',
      isBaptized: false
    }
  });

  const leaderId = watch('leaderId');

  const filteredLeaders = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return leaders.slice(0, 10);
    return leaders.filter(l =>
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(term)
    );
  }, [searchTerm, leaders]);

  const selectedLeader = React.useMemo(() =>
    leaders.find(l => l.id === leaderId)
    , [leaderId, leaders]);

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
    if (!birthDateValue) return null;
    try { return MemberDomain.getKidsClass(new Date(birthDateValue)); } catch { return null; }
  }, [birthDateValue]);

  const onSubmit: SubmitHandler<MemberInput> = async (data) => {
    setServerError(null);
    
    let result;
    if (onSubmitCustom) {
      result = await onSubmitCustom(data);
    } else {
      result = isEditMode
        ? await updateMemberAction(initialData.id, data)
        : await createMemberAction(data);
    }

    if ('success' in result && result.success) {
      if (isPublic) {
        setIsSuccess(true);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else if ('error' in result) {
      setServerError(result.error ?? "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm("Tem certeza que deseja excluir este integrante permanentemente?")) return;

    setIsDeleting(true);
    const result = await deleteMemberAction(initialData.id);
    if ('success' in result && result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setServerError("Falha ao excluir.");
      setIsDeleting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-4xl bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">CADASTRO REALIZADO!</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sua jornada na visão G12 começou. Em breve entraremos em contato.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 max-w-4xl bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-2xl relative">

      <header className="border-b border-slate-100 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
            {isPublic ? "Ficha de Cadastro" : (isEditMode ? "Editar Ficha" : "Novo Integrante")}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-3 italic">
            {isPublic ? "Seja bem-vindo à família" : "Linhagem e Gestão de Gerações"}
          </p>
        </div>
        {(isSubmitting || isDeleting) && <Loader2 className="animate-spin text-blue-600" size={32} />}
      </header>

      {serverError && <div className="p-5 bg-red-50 border-2 border-red-100 text-red-600 rounded-3xl text-sm font-bold">{serverError}</div>}

      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-2">
          <User size={14} /> Dados Identitários
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Primeiro Nome</label>
            <input {...register('firstName')} className="w-full px-8 py-5 rounded-4xl border-2 border-slate-50 bg-slate-50/30 outline-none focus:border-blue-500/20 focus:ring-4 font-bold text-slate-700" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Sobrenome</label>
            <input {...register('lastName')} className="w-full px-8 py-5 rounded-4xl border-2 border-slate-50 bg-slate-50/30 outline-none focus:border-blue-500/20 focus:ring-4 font-bold text-slate-700" />
          </div>
        </div>
      </div>

      <div className="p-8 md:p-10 bg-slate-900 rounded-[3rem] shadow-2xl space-y-8 relative overflow-visible">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
          <Award size={14} /> {isPublic ? "Conexão na Igreja" : "Posicionamento na Visão G12"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic text-center md:text-left block">Líder Direto</label>
            <div className="relative">
              <Search size={18} className="absolute left-6 top-5 text-slate-500" />
              <input
                type="text"
                placeholder={selectedLeader ? `${selectedLeader.firstName} ${selectedLeader.lastName}` : "Pesquisar líder..."}
                value={searchTerm}
                autoComplete="off"
                onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                className="w-full pl-16 pr-6 py-5 rounded-4xl border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-500/20 font-bold text-slate-800 bg-white"
              />
            </div>

            {isOpen && (
              <div className="absolute z-999 w-full mt-3 bg-white rounded-4xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-80 overflow-y-auto custom-scrollbar border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                {!isPublic && (
                  <button
                    type="button"
                    onMouseDown={() => { setValue('leaderId', ''); setSearchTerm(''); setIsOpen(false); }}
                    className={`w-full text-left px-8 py-5 text-[10px] font-black uppercase border-b border-slate-50 flex items-center justify-between ${!leaderId ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    ⭐ Liderança Raiz (Pastor) {!leaderId && <Check size={16} />}
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
                    className={`w-full text-left px-8 py-5 text-sm font-bold border-b border-slate-50 flex items-center justify-between transition-colors ${leaderId === l.id ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="flex flex-col">
                      <span className="leading-none">{l.firstName} {l.lastName}</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase mt-1.5 tracking-widest">Geração {l.generationSlot || '?'}</span>
                    </div>
                    {leaderId === l.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isPublic && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Nível de Geração (1 a 12)</label>
              <div className="relative">
                <ChevronDown size={18} className="absolute right-6 top-5 text-blue-400 pointer-events-none" />
                <select {...register('generationSlot')} className="w-full px-8 py-5 rounded-4xl border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-500/20 font-black text-slate-800 cursor-pointer appearance-none bg-white h-16">
                  <option value="">⏳ AGUARDANDO POSIÇÃO</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`${i + 1}`}>GERAÇÃO {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-2">
          <label className="ml-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase"><Calendar size={14} className="text-blue-600" /> Nascimento</label>
          <input type="date" {...register('birthDate')} className="w-full px-8 py-5 rounded-4xl border-2 border-slate-50 bg-slate-50/30 outline-none font-bold text-slate-700 focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all" />
          {kidsClass && <span className="ml-4 text-[9px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Trilha: {kidsClass}</span>}
        </div>

        <div className="space-y-2">
          <label className="ml-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase"><Phone size={14} className="text-blue-600" /> WhatsApp</label>
          <Controller
            name="phone"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <PatternFormat
                {...field}
                format="(##) #####-####"
                mask="_"
                value={value}
                onValueChange={(values) => onChange(values.value)}
                placeholder="(86) 99999-9999"
                className="w-full px-8 py-5 rounded-4xl border-2 border-slate-50 bg-slate-50/30 outline-none font-bold text-slate-700 shadow-sm"
              />
            )}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 pt-6">
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className={`flex-1 py-7 rounded-[2.5rem] text-white font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 text-sm ${isSubmitting ? 'bg-slate-400' : 'bg-linear-to-r from-blue-600 to-indigo-700 hover:scale-[1.02] active:scale-[0.98]'}`}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : (isEditMode ? <><Save size={20} /> Salvar Alterações</> : (isPublic ? "Enviar Cadastro" : "Cadastrar na Visão"))}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="px-10 py-7 rounded-[2.5rem] bg-red-50 text-red-600 font-black uppercase tracking-widest text-[10px] hover:bg-red-600 hover:text-white transition-all active:scale-95 border-2 border-red-100 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} /> Excluir Registro
          </button>
        )}
      </div>
    </form>
  );
};
