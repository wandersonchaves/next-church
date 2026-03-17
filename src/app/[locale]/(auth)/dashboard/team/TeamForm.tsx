'use client';

import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { sendTeamInviteAction } from './actions';
import { useParams } from 'next/navigation';

const InviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
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
      role: 'org:member'
    }
  });

  const onSubmit: SubmitHandler<InviteInput> = async (data) => {
    setError(null);

    // Capturamos a URL base atual (localhost ou railway)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const res = await sendTeamInviteAction({
      ...data,
      locale,
      origin // Enviamos o origin para a action
    });

    if (res.success) {
      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 3000);
    } else {
      setError(res.error || "Erro ao enviar convite.");
    }
  };

  return (
    <div className="w-full md:w-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-lg">
        <div className="relative flex-1 min-w-60">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            {...register('email')}
            type="email"
            placeholder="E-mail do novo obreiro..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          {...register('role')}
          className="bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="org:member">Obreiro</option>
          <option value="org:admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 shadow-lg'}`}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : isSuccess ? <CheckCircle2 size={16} /> : <><UserPlus size={16} /> Convidar</>}
        </button>
      </form>
      {error && <p className="text-[10px] font-bold text-red-500 mt-2 ml-4 uppercase tracking-tighter">{error}</p>}
    </div>
  );
}
