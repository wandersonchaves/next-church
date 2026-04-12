import { getG12Hierarchy } from '@/libs/services/MemberService';
import { MemberForm } from '@/components/MemberForm';
import { createPublicMemberAction } from './actions';

interface JoinPageProps {
  params: Promise<{
    locale: string;
    orgId: string;
  }>;
}

/**
 * Página pública de cadastro de novos membros.
 * Acessível via /[locale]/join/[orgId]
 */
export default async function JoinPage({ params }: JoinPageProps) {
  const { orgId } = await params;

  // Busca a hierarquia da organização específica para que o novo membro escolha seu líder
  const leaders = await getG12Hierarchy(orgId);

  // Wrapper para a action pública
  const handlePublicSubmit = async (data: any) => {
    'use server';
    return createPublicMemberAction(orgId, data);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Faça parte da nossa família
          </h1>
          <p className="text-slate-500 font-medium">
            Preencha seus dados abaixo para iniciar sua jornada na visão G12.
          </p>
        </div>

        <MemberForm 
          leaders={leaders as any} 
          isPublic={true}
          onSubmitCustom={handlePublicSubmit}
        />

        <footer className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-8">
          &copy; {new Date().getFullYear()} NextChurch - Gestão Eclesiástica Inteligente
        </footer>
      </div>
    </div>
  );
}
