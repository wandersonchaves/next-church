'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/libs/DB';
import { logActivity } from '@/libs/services/AuditService';
import { literacyStudents, ministries } from '@/models/Schema';
import { type LiteracyStudentInput, LiteracyStudentSchema } from '@/validations/LiteracyValidation';

/**
 * Cadastra um novo aluno de Alfabetização a partir da tela pública / voluntário na comunidade.
 * @param data - Dados do aluno de alfabetização a ser cadastrado.
 */
export async function createPublicLiteracyRegistrationAction(data: LiteracyStudentInput & { orgId?: string }) {
  const validated = LiteracyStudentSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Dados inválidos.' };
  }

  try {
    let targetOrgId = data.orgId;

    // Se não veio no payload, tenta obter da sessão autenticada (se o voluntário estiver logado)
    if (!targetOrgId) {
      const { orgId } = await auth();
      targetOrgId = orgId || undefined;
    }

    // Se ainda não tiver orgId (acesso público anônimo), resolve a organização padrão do banco
    if (!targetOrgId) {
      const [firstOrg] = await db
        .select({ organizationId: ministries.organizationId })
        .from(ministries)
        .limit(1);

      targetOrgId = firstOrg?.organizationId || 'default_org';
    }

    const [student] = await db
      .insert(literacyStudents)
      .values({
        organizationId: targetOrgId,
        studentName: validated.data.studentName.trim(),
        guardianName: validated.data.guardianName?.trim() || null,
        guardianPhone: validated.data.guardianPhone.trim(),
        address: validated.data.address.trim(),
        neighborhood: validated.data.neighborhood?.trim() || null,
        city: validated.data.city?.trim() || 'Teresina',
        age: Number(validated.data.age),
        birthDate: validated.data.birthDate ? new Date(validated.data.birthDate) : null,
        gender: validated.data.gender,
        educationLevel: validated.data.educationLevel,
        preferredShift: validated.data.preferredShift,
        hasSpecialNeeds: validated.data.hasSpecialNeeds,
        specialNeedsDetails: validated.data.specialNeedsDetails?.trim() || null,
        registeredBy: validated.data.registeredBy?.trim() || 'Comunidade (Voluntário)',
        status: 'INSCRITO',
        notes: validated.data.notes?.trim() || null,
      })
      .returning();

    await logActivity('CREATE', 'LITERACY', `${student?.studentName} (Inscrição na Comunidade)`).catch(() => { });

    revalidatePath('/dashboard/alfabetizacao');
    return { success: true, id: student?.id };
  } catch (error) {
    console.error('[PUBLIC_LITERACY_REGISTRATION_ERROR]', error);
    return { error: error instanceof Error ? error.message : 'Falha ao processar cadastro na comunidade.' };
  }
}
