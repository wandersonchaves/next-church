'use client';

import type { SubmitHandler } from 'react-hook-form';
import type { MemberInput } from '@/validations/MemberValidation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
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
  const [error, setError] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<MemberInput>({
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
    setError(null);
    const result = await createMemberAction(data);

    // Type Guard para validar o retorno da Server Action
    if ('success' in result && result.success) {
      router.push('/dashboard');
      router.refresh();
    } else if ('error' in result) {
      setError(result.error || 'Ocorreu um erro desconhecido.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50">
      {error && (
        <div className="animate-bounce rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          ⚠️
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Nome</label>
          <input {...register('firstName')} className="w-full rounded-2xl border-2 border-slate-100 px-5 py-4 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5" placeholder="João" />
        </div>
        <div className="space-y-1">
          <label htmlFor="lastName" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Sobrenome</label>
          <input {...register('lastName')} className="w-full rounded-2xl border-2 border-slate-100 px-5 py-4 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5" placeholder="Silva" />
        </div>
      </div>

      <div className="space-y-6 rounded-4xl border-2 border-slate-100 bg-slate-50/50 p-8">
        <div className="space-y-1">
          <label htmlFor="leader" className="ml-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">Líder G12</label>
          <select {...register('leaderId')} className="w-full rounded-2xl border-2 border-white bg-white px-5 py-4 font-black text-slate-800 shadow-sm outline-none focus:border-blue-500/20">
            <option value="">⭐ PASTOR PRINCIPAL</option>
            {props.leaders.map((l) => {
              const indentation = '\u00A0'.repeat((l.level - 1) * 4);
              const label = l.level === 1 ? '[PASTOR]' : `[F${l.generationSlot || '?'}]`;
              return (
                <option key={l.id} value={l.id}>
                  {indentation}
                  └─
                  {l.firstName}
                  {' '}
                  {l.lastName}
                  {' '}
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="generation" className="ml-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">Geração do Membro (F1 a F12)</label>
          <select {...register('generationSlot')} className="w-full rounded-2xl border-2 border-white bg-white px-5 py-4 font-black text-slate-800 shadow-sm outline-none focus:border-blue-500/20">
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

      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="birthDay" className="ml-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">Data de Nascimento</label>
          <input type="date" {...register('birthDate')} className="w-full rounded-2xl border-2 border-slate-100 px-5 py-4 font-bold text-slate-700 transition-all outline-none focus:border-blue-500/20" />
          {kidsClass && (
            <p className="ml-2 text-[10px] font-black text-blue-600 uppercase">
              Trilha Kids:
              {kidsClass}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 space-y-1 pt-6">
          <input type="checkbox" {...register('isBaptized')} id="isBaptized" className="h-6 w-6 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500/20" />
          <label htmlFor="isBaptized" className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Membro é Batizado?</label>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full rounded-3xl bg-linear-to-r from-blue-600 to-indigo-700 py-5 font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
        {isSubmitting ? 'Gravando...' : 'Finalizar Cadastro'}
      </button>
    </form>
  );
};
