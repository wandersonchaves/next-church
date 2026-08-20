'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { literacyStudents } from '@/models/Schema';
import { LiteracyStudentSchema, type LiteracyStudentInput } from '@/validations/LiteracyValidation';
import { logActivity } from '@/libs/services/AuditService';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Cadastra um novo aluno na lista de Alfabetização dentro do dashboard.
 */
export async function createLiteracyStudentAction(data: LiteracyStudentInput) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: 'Organização não selecionada ou usuário não autorizado.' };
  }

  const validated = LiteracyStudentSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Dados inválidos.' };
  }

  try {
    const [student] = await db
      .insert(literacyStudents)
      .values({
        organizationId: orgId,
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
        registeredBy: validated.data.registeredBy?.trim() || null,
        status: validated.data.status || 'INSCRITO',
        assignedClass: validated.data.assignedClass?.trim() || null,
        notes: validated.data.notes?.trim() || null,
      })
      .returning();

    await logActivity('CREATE', 'LITERACY', `${student?.studentName} (Alfabetização)`).catch(() => {});

    revalidatePath('/dashboard/alfabetizacao');
    return { success: true, student };
  } catch (error) {
    console.error('[CREATE_LITERACY_STUDENT_ERROR]', error);
    return { error: error instanceof Error ? error.message : 'Falha ao cadastrar aluno de alfabetização.' };
  }
}

/**
 * Busca a lista de alunos da Alfabetização da organização com filtros opcionais.
 */
export async function getLiteracyStudentsAction(filters?: {
  query?: string;
  shift?: string;
  status?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) return [];

  try {
    const conditions = [eq(literacyStudents.organizationId, orgId)];

    if (filters?.shift && filters.shift !== 'ALL') {
      conditions.push(eq(literacyStudents.preferredShift, filters.shift as any));
    }

    if (filters?.status && filters.status !== 'ALL') {
      conditions.push(eq(literacyStudents.status, filters.status as any));
    }

    if (filters?.query) {
      const q = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(literacyStudents.studentName, q),
          ilike(literacyStudents.guardianName, q),
          ilike(literacyStudents.guardianPhone, q),
          ilike(literacyStudents.neighborhood, q),
          ilike(literacyStudents.address, q)
        )!
      );
    }

    return await db
      .select()
      .from(literacyStudents)
      .where(and(...conditions))
      .orderBy(desc(literacyStudents.createdAt));
  } catch (error) {
    console.error('[GET_LITERACY_STUDENTS_ERROR]', error);
    return [];
  }
}

/**
 * Busca métricas agregadas da Alfabetização para a organização.
 */
export async function getLiteracyMetricsAction() {
  const { orgId } = await auth();
  if (!orgId) return null;

  try {
    const all = await db
      .select()
      .from(literacyStudents)
      .where(eq(literacyStudents.organizationId, orgId));

    const total = all.length;
    const byShift = {
      MANHA: all.filter(s => s.preferredShift === 'MANHA').length,
      TARDE: all.filter(s => s.preferredShift === 'TARDE').length,
      NOITE: all.filter(s => s.preferredShift === 'NOITE').length,
      SABADO: all.filter(s => s.preferredShift === 'SABADO').length,
    };

    const byStatus = {
      INSCRITO: all.filter(s => s.status === 'INSCRITO').length,
      CONFIRMADO: all.filter(s => s.status === 'CONFIRMADO').length,
      TURMA_FORMADA: all.filter(s => s.status === 'TURMA_FORMADA').length,
      DESISTENTE: all.filter(s => s.status === 'DESISTENTE').length,
    };

    const byEducation = {
      NUNCA_ESTUDOU: all.filter(s => s.educationLevel === 'NUNCA_ESTUDOU').length,
      ALFABETIZANDO_INICIAL: all.filter(s => s.educationLevel === 'ALFABETIZANDO_INICIAL').length,
      FUNDAMENTAL_INCOMPLETO: all.filter(s => s.educationLevel === 'FUNDAMENTAL_INCOMPLETO').length,
      OUTROS: all.filter(s => !['NUNCA_ESTUDOU', 'ALFABETIZANDO_INICIAL', 'FUNDAMENTAL_INCOMPLETO'].includes(s.educationLevel)).length,
    };

    const avgAge = total > 0 ? Math.round(all.reduce((acc, curr) => acc + curr.age, 0) / total) : 0;

    return {
      total,
      byShift,
      byStatus,
      byEducation,
      avgAge,
    };
  } catch (error) {
    console.error('[GET_LITERACY_METRICS_ERROR]', error);
    return null;
  }
}

/**
 * Atualiza os dados de um aluno da Alfabetização.
 */
export async function updateLiteracyStudentAction(id: string, data: Partial<LiteracyStudentInput>) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado.' };

  try {
    const updateValues: Record<string, any> = { ...data };
    if (data.age) updateValues.age = Number(data.age);
    if (data.birthDate) updateValues.birthDate = new Date(data.birthDate);

    const [updated] = await db
      .update(literacyStudents)
      .set(updateValues)
      .where(and(eq(literacyStudents.id, id), eq(literacyStudents.organizationId, orgId)))
      .returning();

    if (updated) {
      await logActivity('UPDATE', 'LITERACY', `${updated.studentName} (Alfabetização)`).catch(() => {});
    }

    revalidatePath('/dashboard/alfabetizacao');
    return { success: true, student: updated };
  } catch (error) {
    console.error('[UPDATE_LITERACY_STUDENT_ERROR]', error);
    return { error: error instanceof Error ? error.message : 'Falha ao atualizar cadastro.' };
  }
}

/**
 * Atualiza rapidamente a turma atribuída e status do aluno.
 */
export async function assignLiteracyClassAction(id: string, assignedClass: string, status?: 'INSCRITO' | 'CONFIRMADO' | 'TURMA_FORMADA' | 'DESISTENTE') {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado.' };

  try {
    const [updated] = await db
      .update(literacyStudents)
      .set({
        assignedClass: assignedClass.trim(),
        status: status || 'TURMA_FORMADA',
      })
      .where(and(eq(literacyStudents.id, id), eq(literacyStudents.organizationId, orgId)))
      .returning();

    if (updated) {
      await logActivity('UPDATE', 'LITERACY', `Turma: ${assignedClass} para ${updated.studentName}`).catch(() => {});
    }

    revalidatePath('/dashboard/alfabetizacao');
    return { success: true, student: updated };
  } catch (error) {
    console.error('[ASSIGN_LITERACY_CLASS_ERROR]', error);
    return { error: error instanceof Error ? error.message : 'Falha ao alocar turma.' };
  }
}

/**
 * Remove um registro de aluno da Alfabetização.
 */
export async function deleteLiteracyStudentAction(id: string) {
  const { orgId } = await auth();
  if (!orgId) return { error: 'Não autorizado.' };

  try {
    const [student] = await db
      .select({ studentName: literacyStudents.studentName })
      .from(literacyStudents)
      .where(and(eq(literacyStudents.id, id), eq(literacyStudents.organizationId, orgId)))
      .limit(1);

    await db
      .delete(literacyStudents)
      .where(and(eq(literacyStudents.id, id), eq(literacyStudents.organizationId, orgId)));

    if (student) {
      await logActivity('DELETE', 'LITERACY', `${student.studentName} (Alfabetização)`).catch(() => {});
    }

    revalidatePath('/dashboard/alfabetizacao');
    return { success: true };
  } catch (error) {
    console.error('[DELETE_LITERACY_STUDENT_ERROR]', error);
    return { error: error instanceof Error ? error.message : 'Falha ao excluir registro.' };
  }
}
