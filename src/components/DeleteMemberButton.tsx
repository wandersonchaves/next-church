'use client';

import { Trash2 } from 'lucide-react';
import * as React from 'react';
import { deleteMemberAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { useRouter } from '@/libs/I18nNavigation';

export function DeleteMemberButton(props: { memberId: string; memberName: string }) {
  const [isPending, startTransition] = React.useTransition();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const router = useRouter();

  const handleDelete = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteMemberAction(props.memberId);
      if (result.success) {
        setIsConfirming(false);
        router.refresh();
      } else {
        setIsConfirming(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={`rounded-lg p-2 transition-colors ${
        isPending
          ? 'cursor-not-allowed text-slate-200'
          : isConfirming
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
      }`}
      title={isConfirming ? `Confirmar exclusão de ${props.memberName}?` : 'Excluir (Soft Delete)'}
    >
      <Trash2 size={18} className={isPending ? 'animate-pulse' : ''} />
    </button>
  );
}
