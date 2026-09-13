import { and, eq, ilike, isNull } from 'drizzle-orm';
import { db } from '../libs/DB';
import { members } from '../models/Schema';
import 'dotenv/config';

/**
 * Script CLI: Cadastro / Atualização do Membro de Testes em PRD.
 *
 * Garante que o número 86995206925 (Wanderson Chaves) está cadastrado e
 * marcado com a tag TESTE_PRD para homologação segura de disparos WhatsApp.
 */
async function run() {
  const TEST_PHONE = '86995206925';
  const FIRST_NAME = 'Wanderson';
  const LAST_NAME = 'Chaves (Teste PRD)';
  const TAG = 'TESTE_PRD';

  console.log(`🧪 [SEED_TEST_MEMBER] Verificando cadastro de teste para o telefone: ${TEST_PHONE}...`);

  // Busca a organização principal (ou TelePaz)
  const firstMember = await db.query.members.findFirst({
    where: isNull(members.deletedAt),
  });

  const orgId = firstMember?.organizationId || process.env.NEXT_PUBLIC_CLERK_DEFAULT_ORG || 'system';
  console.log(`🏛️ [SEED_TEST_MEMBER] Organização alvo: ${orgId}`);

  const suffix8 = TEST_PHONE.slice(-8);
  const [existing] = await db
    .select()
    .from(members)
    .where(and(
      eq(members.organizationId, orgId),
      ilike(members.phone, `%${suffix8}`),
      isNull(members.deletedAt),
    ))
    .limit(1);

  if (existing) {
    console.log(`✅ [SEED_TEST_MEMBER] Membro encontrado: ${existing.firstName} ${existing.lastName} (ID: ${existing.id}).`);
    await db
      .update(members)
      .set({
        kidsNotes: TAG,
        phone: TEST_PHONE,
        updatedAt: new Date(),
      })
      .where(eq(members.id, existing.id));

    console.log(`🎉 [SEED_TEST_MEMBER] Tag ${TAG} aplicada com sucesso ao membro existente!`);
  } else {
    console.log(`➕ [SEED_TEST_MEMBER] Inserindo novo membro de teste...`);
    const [inserted] = await db.insert(members).values({
      organizationId: orgId,
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      phone: TEST_PHONE,
      gender: 'M',
      birthDate: new Date('1990-01-01'),
      kidsNotes: TAG,
      currentStep: 'DECISION',
      isBaptized: false,
      status: 'ACTIVE',
    }).returning({ id: members.id });

    console.log(`🎉 [SEED_TEST_MEMBER] Membro de teste criado com sucesso! (ID: ${inserted?.id})`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [SEED_TEST_MEMBER_ERROR]', err);
  process.exit(1);
});
