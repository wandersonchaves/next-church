import { auth } from '@clerk/nextjs/server';
import { MemberForm } from '@/components/MemberForm';
import { getG12Hierarchy } from '@/libs/services/MemberService';

/**
 * Página de Novo Membro.
 * Agora utiliza a hierarquia recursiva para listar líderes de forma organizada.
 */
export default async function NewMemberPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return <div>Selecione uma Organização</div>;
  }

  // Busca a lista de membros já com níveis de geração e ordenação hierárquica
  const hierarchicalLeaders = await getG12Hierarchy(orgId);

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Cadastrar Novo Membro</h1>
        <p className="font-medium text-slate-500 italic">Vincule o novo discípulo à linhagem correta da igreja.</p>
      </header>

      <MemberForm leaders={hierarchicalLeaders as any} />
    </div>
  );
}
