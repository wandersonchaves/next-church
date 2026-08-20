import { auth } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { LiteracyRegistrationForm } from '@/components/Literacy/LiteracyRegistrationForm';
import { Link } from '@/libs/I18nNavigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewLiteracyStudentPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const { orgId } = await auth();
  if (!orgId) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold text-slate-700">Selecione uma organização.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/alfabetizacao"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Voltar para Lista de Alfabetização
        </Link>
      </div>

      <LiteracyRegistrationForm isPublic={false} orgId={orgId} />
    </div>
  );
}
