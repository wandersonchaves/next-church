import { db } from '@/libs/DB';
import { members } from '@/models/Schema';

/**
 * Insere um líder raiz para teste.
 * @param orgId - O ID da Organização do Clerk
 */
export async function seedRootLeader(orgId: string) {
  const result = await db.insert(members).values({
    organizationId: orgId,
    firstName: 'Pastor',
    lastName: 'Presidente',
    email: 'contato@igreja.com',
    phone: '11999999999',
    birthDate: new Date('1980-01-01'),
    gender: 'M',
    currentStep: 'SENDING',
    isLeader: true,
  }).returning();

  return result[0];
}
