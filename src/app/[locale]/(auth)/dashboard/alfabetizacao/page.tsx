import { auth, clerkClient } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { LiteracyDashboardClient } from '@/components/Literacy/LiteracyDashboardClient';
import {
  getLiteracyStudentsAction,
  getLiteracyMetricsAction,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function LiteracyDashboardPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const { orgId } = await auth();
  if (!orgId) {
    return (
      <div className="flex h-96 items-center justify-center p-8 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-base font-bold text-slate-700">Selecione uma organização para acessar o módulo de Alfabetização.</p>
        </div>
      </div>
    );
  }

  let organizationName = 'Sua Igreja';
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    if (org.name) {
      organizationName = org.name;
    }
  } catch {
    // Fallback silencioso
  }

  const [students, metrics] = await Promise.all([
    getLiteracyStudentsAction(),
    getLiteracyMetricsAction(),
  ]);

  return (
    <LiteracyDashboardClient
      initialStudents={students as any}
      metrics={metrics}
      organizationName={organizationName}
    />
  );
}
