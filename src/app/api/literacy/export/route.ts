import type { NextRequest } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { logActivity } from '@/libs/services/AuditService';
import { literacyStudents } from '@/models/Schema';
import { generateLiteracyCsv } from '@/utils/LiteracyExport';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de alta performance para exportação da relação de alunos para o órgão responsável.
 * Retorna diretamente o arquivo CSV com codificação UTF-8 BOM compatível com Excel e sistemas de gestão.
 * @param request - NextRequest com parâmetros de filtro da exportação.
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return new Response('Não autorizado: Organização não identificada.', { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get('status') || 'INSCRITO';
  const shiftParam = searchParams.get('shift');

  try {
    const conditions = [eq(literacyStudents.organizationId, orgId)];

    if (statusParam && statusParam !== 'ALL') {
      conditions.push(eq(literacyStudents.status, statusParam as any));
    }

    if (shiftParam && shiftParam !== 'ALL') {
      conditions.push(eq(literacyStudents.preferredShift, shiftParam as any));
    }

    const students = await db
      .select()
      .from(literacyStudents)
      .where(and(...conditions))
      .orderBy(asc(literacyStudents.studentName));

    // Busca opcional do nome da organização para registro de auditoria
    let orgName = 'Igreja';
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      if (org.name) {
        orgName = org.name;
      }
    } catch {
      // Falha silenciosa em caso de indisponibilidade momentânea do Clerk
    }

    const csvContent = generateLiteracyCsv(students);

    // Auditoria assíncrona fora de transação
    logActivity(
      'EXPORT',
      'LITERACY',
      `Exportação de ${students.length} alunos (${statusParam}) para órgão responsável (${orgName})`,
    ).catch(() => {});

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeStatus = statusParam.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `relacao_alunos_alfabetizacao_${safeStatus}_${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('[LITERACY_EXPORT_ERROR]', error);
    return new Response(
      error instanceof Error ? error.message : 'Erro ao processar exportação de alunos.',
      { status: 500 },
    );
  }
}
