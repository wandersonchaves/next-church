'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Mail, UserPlus } from 'lucide-react';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { sendTeamInviteAction } from './actions';

const InviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['org:admin', 'org:member']),
});

type InviteInput = z.infer<typeof InviteSchema>;

export default function TeamForm() {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<InviteInput>({
    resolver: zodResolver(InviteSchema),
    defaultValues: {
      email: '',
      role: 'org:member',
    },
  });

  const onSubmit: SubmitHandler<InviteInput> = async (data) => {
    setError(null);

    // Capturamos a URL base atual (localhost ou railway)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const res = await sendTeamInviteAction({
      ...data,
      locale,
      origin, // Enviamos o origin para a action
    });

    if (res.success) {
      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 3000);
    } else {
      setError(res.error || 'Erro ao enviar convite.');
    }
  };

  return (
    <div className="w-full md:w-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg md:flex-row">
        <div className="relative min-w-60 flex-1">
          <Mail className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" size={16} />
          <input
            {...register('email')}
            type="email"
            placeholder="E-mail do novo obreiro..."
            className="w-full rounded-xl border-none bg-slate-50 py-3 pr-4 pl-12 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          {...register('role')}
          className="rounded-xl border-none bg-slate-50 px-4 py-3 text-[10px] font-black tracking-widest text-slate-500 uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="org:member">Obreiro</option>
          <option value="org:admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700'}`}
        >
          {isSubmitting
            ? <Loader2 className="animate-spin" size={16} />
            : isSuccess
              ? <CheckCircle2 size={16} />
              : (
                  <>
                    <UserPlus size={16} />
                    {' '}
                    Convidar
                  </>
                )}
        </button>
      </form>
      {error && <p className="mt-2 ml-4 text-[10px] font-bold tracking-tighter text-red-500 uppercase">{error}</p>}
    </div>
  );
}
