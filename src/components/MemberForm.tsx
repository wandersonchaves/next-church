'use client';

import type { SubmitHandler } from 'react-hook-form';
import type { MemberInput } from '@/validations/MemberValidation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Award, Calendar, Loader2, Mail, Phone, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { createMemberAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { MemberDomain } from '@/utils/MemberDomain';
import { MemberSchema } from '@/validations/MemberValidation';

type MemberFormProps = {
  leaders: {
    id: string;
    firstName: string;
    lastName: string;
    level: number;
    generationSlot: number | null;
  }[];
};

export const MemberForm = (props: MemberFormProps) => {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<MemberInput>({
    resolver: zodResolver(MemberSchema),
    defaultValues: {
      gender: 'M',
      currentStep: 'DECISION',
      birthDate: '',
      phone: '',
      email: '',
      leaderId: '',
      generationSlot: '',
      isBaptized: false,
    },
  });

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
    const result = await createMemberAction(data);

    if ('success' in result && result.success) {
      router.push('/dashboard');
      router.refresh();
    } else if ('error' in result) {
      setServerError(result.error ?? 'Ocorreu um erro desconhecido.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-8 rounded-[3rem] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/50">

      {/* HEADER ALINHADO À ESQUERDA (Fase 5) */}
      <div className="border-b border-slate-50 pb-8">
        <h2 className="text-3xl leading-none font-black tracking-tight text-slate-900 uppercase">Cadastrar Novo Membro</h2>
        <p className="mt-2 text-xs font-bold tracking-[0.2em] text-slate-400 uppercase italic">Vincule o novo discípulo à linhagem correta da igreja.</p>
      </div>

      {serverError && (
        <div className="flex animate-pulse items-center gap-3 rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <Award size={18} className="rotate-180" />
          {' '}
          {serverError}
        </div>
      )}

      {/* Seção: Identificação */}
      <div className="space-y-6">
        <h3 className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-600 uppercase">
          <User size={14} />
          {' '}
          Dados Identitários
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Primeiro Nome</label>
            <input {...register('firstName')} className={`w-full rounded-2xl border-2 px-6 py-4 font-bold text-slate-700 transition-all outline-none ${errors.firstName ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5'}`} placeholder="Ex: João" />
            {errors.firstName && <p className="ml-2 text-[10px] font-bold text-red-500">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Sobrenome</label>
            <input {...register('lastName')} className={`w-full rounded-2xl border-2 px-6 py-4 font-bold text-slate-700 transition-all outline-none ${errors.lastName ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5'}`} placeholder="Ex: Silva" />
            {errors.lastName && <p className="ml-2 text-[10px] font-bold text-red-500">{errors.lastName.message}</p>}
          </div>
        </div>
      </div>

      {/* Seção: Hierarquia */}
      <div className="space-y-8 rounded-[2.5rem] border-2 border-slate-100 bg-slate-50/50 p-8">
        <h3 className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-blue-600 uppercase">
          <Award size={14} />
          {' '}
          Posicionamento na Visão
        </h3>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="leader" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Líder Direto</label>
            <select {...register('leaderId')} className="w-full cursor-pointer rounded-2xl border-none bg-white px-6 py-4 font-black text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10">
              <option value="">⭐ PASTOR PRINCIPAL</option>
              {props.leaders.map((l) => {
                const indentation = '\u00A0'.repeat((l.level - 1) * 4);
                return (
                  <option key={l.id} value={l.id}>
                    {indentation}
                    └─
                    {l.firstName}
                    {' '}
                    {l.lastName}
                    {' '}
                    [F
                    {l.generationSlot || '?'}
                    ]
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="generation" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Geração (F1 a F12)</label>
            <select {...register('generationSlot')} className="w-full cursor-pointer rounded-2xl border-none bg-white px-6 py-4 font-black text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10">
              <option value="">⏳ AGUARDANDO DEFINIÇÃO</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={`${i + 1}`}>
                  Geração F
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Seção: Perfil e Contato */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ml-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              <Calendar size={12} />
              {' '}
              Nascimento
            </label>
            <input type="date" {...register('birthDate')} className={`w-full rounded-2xl border-2 px-6 py-4 font-bold text-slate-700 transition-all outline-none ${errors.birthDate ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5'}`} />
            {kidsClass && (
              <p className="mt-1 ml-2 text-[10px] font-black tracking-tighter text-blue-600 uppercase">
                Trilha Kids:
                {kidsClass}
              </p>
            )}
          </div>

          {/* MÁSCARA DE TELEFONE INTELIGENTE (Fase 5) */}
          <div className="space-y-1.5">
            <label className="ml-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              <Phone size={12} />
              {' '}
              Telefone
            </label>
            <Controller
              name="phone"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <PatternFormat
                  {...field}
                  format="(##) #####-####"
                  mask="_"
                  value={value}
                  onValueChange={(values) => {
                    onChange(values.value); // Envia apenas o número puro (sem máscara) para o backend
                  }}
                  placeholder="(86) 99999-9999"
                  className="w-full rounded-2xl border-2 border-slate-100 px-6 py-4 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5"
                />
              )}
            />
            <p className="ml-2 text-[9px] font-medium text-slate-400 italic">O prefixo 55 será adicionado automaticamente no envio.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ml-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              <Mail size={12} />
              {' '}
              E-mail (Opcional)
            </label>
            <input {...register('email')} className="w-full rounded-2xl border-2 border-slate-100 px-6 py-4 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5" placeholder="exemplo@igreja.com" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="gender" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Gênero</label>
            <select {...register('gender')} className="w-full rounded-2xl border-2 border-slate-100 bg-white px-6 py-4 font-bold text-slate-700 outline-none">
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
        </div>

        {/* Checkbox Batismo */}
        <div className="flex items-center justify-between rounded-4xl border-2 border-blue-100 bg-blue-50/50 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-600 p-3 text-white shadow-md"><Award size={20} /></div>
            <div>
              <p className="text-sm leading-none font-black tracking-tight text-slate-800 uppercase">Status de Batismo</p>
              <p className="mt-1 text-[10px] font-bold tracking-widest text-blue-600 uppercase">Membro já passou pelas águas?</p>
            </div>
          </div>
          <input type="checkbox" {...register('isBaptized')} className="h-8 w-8 cursor-pointer rounded-xl border-2 border-blue-200 text-blue-600 transition-all focus:ring-blue-500/20" />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`flex w-full items-center justify-center gap-3 rounded-4xl py-6 font-black tracking-[0.2em] text-white uppercase shadow-2xl transition-all ${isSubmitting ? 'bg-slate-400' : 'bg-linear-to-r from-blue-600 to-indigo-700 shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]'}`}
      >
        {isSubmitting
          ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                {' '}
                Gravando na Linhagem...
              </>
            )
          : (
              'Finalizar Cadastro de Membro'
            )}
      </button>
    </form>
  );
};
