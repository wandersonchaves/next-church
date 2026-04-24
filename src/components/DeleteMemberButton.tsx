'use client';

import { Trash2 } from 'lucide-react';
import { deleteMemberAction } from '@/app/[locale]/(auth)/dashboard/members/actions';
import { useRouter } from '@/libs/I18nNavigation';
import { useTransition } from 'react';

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm(`Deseja realmente remover ${memberName}? Esta ação pode ser desfeita pelo administrador.`)) {
      startTransition(async () => {
        const result = await deleteMemberAction(memberId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error || 'Erro ao excluir membro.');
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`p-2 rounded-lg transition-colors ${isPending ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
      title="Excluir (Soft Delete)"
    >
      <Trash2 size={18} className={isPending ? 'animate-pulse' : ''} />
    </button>
  );
}
