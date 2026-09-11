import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { LiteracyReportPageClient } from '@/components/Literacy/LiteracyReportPageClient';
import { db } from '@/libs/DB';
import { literacyStudents } from '@/models/Schema';

export const dynamic = 'force-dynamic';

export default async function LiteracyReportPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; shift?: string }>;
}) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(locale);

  const { orgId } = await auth();
  if (!orgId) {
    return (
      <div className="flex h-96 items-center justify-center p-8 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-base font-bold text-slate-700">Selecione uma organização para acessar o relatório.</p>
        </div>
      </div>
    );
  }

  const selectedStatus = searchParams.status || 'INSCRITO';
  const selectedShift = searchParams.shift || 'ALL';

  let organizationName = 'NextChurch';
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    if (org.name) {
      organizationName = org.name;
    }
  } catch {
    // Fallback silencioso
  }

  const conditions = [eq(literacyStudents.organizationId, orgId)];
  if (selectedStatus && selectedStatus !== 'ALL') {
    conditions.push(eq(literacyStudents.status, selectedStatus as any));
  }
  if (selectedShift && selectedShift !== 'ALL') {
    conditions.push(eq(literacyStudents.preferredShift, selectedShift as any));
  }

  const students = await db
    .select()
    .from(literacyStudents)
    .where(and(...conditions))
    .orderBy(asc(literacyStudents.studentName));

  return (
    <LiteracyReportPageClient
      students={students as any}
      organizationName={organizationName}
      selectedStatus={selectedStatus}
      selectedShift={selectedShift}
    />
  );
}
