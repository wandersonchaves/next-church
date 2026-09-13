import type { MemberInput } from '@/validations/MemberValidation';
import { MemberForm } from '@/components/MemberForm';
import { getG12Hierarchy } from '@/libs/services/MemberService';
import { createPublicMemberAction } from './actions';

type JoinPageProps = {
  params: Promise<{
    locale: string;
    orgId: string;
  }>;
};

/**
 * Página pública de cadastro de novos membros.
 * Acessível via /[locale]/join/[orgId]
 * @param props - Propriedades da página contendo os parâmetros de rota.
 */
export default async function JoinPage(props: JoinPageProps) {
  const { orgId } = await props.params;

  // Busca a hierarquia da organização específica para que o novo membro escolha seu líder
  const leaders = await getG12Hierarchy(orgId);

  // Wrapper para a action pública
  const handlePublicSubmit = async (data: MemberInput) => {
    'use server';
    return createPublicMemberAction(orgId, data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
            Faça parte da nossa família
          </h1>
          <p className="font-medium text-slate-500">
            Preencha seus dados abaixo para iniciar sua jornada na visão G12.
          </p>
        </div>

        <MemberForm
          leaders={leaders as any}
          isPublic
          onSubmitCustomAction={handlePublicSubmit}
        />

        <footer className="pt-8 text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          &copy;
          {' '}
          {new Date().getFullYear()}
          {' '}
          NextChurch - Gestão Eclesiástica Inteligente
        </footer>
      </div>
    </div>
  );
}
