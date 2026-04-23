import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../libs/DB';
import { members } from '../models/Schema';
import { eq, and } from 'drizzle-orm';

/**
 * Script de Importação de Membros via CSV
 * Foco: TelePaz Filadélfia - Universidade da Vida
 */
async function run() {
  const orgId = "org_3AnSpFjJduHOXVTu191GR8W9Iu2"; // Org ID TelePaz
  const filePath = 'MEMBROS_IMPORT.csv';

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo ${filePath} não encontrado. Por favor, crie-o na raiz do projeto.`);
    process.exit(1);
  }

  console.log('🚀 Iniciando importação dinâmica de membros...');

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  interface MemberRecord {
    'NOME COMPLETO': string;
    'GÊNERO': string;
    'CONVIDADO(A) POR': string;
    'GERAÇÃO': string;
  }

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ',' // Altere para ';' se o seu Excel usar ponto e vírgula
  }) as MemberRecord[];

  let importedCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    try {
      // 1. Tratamento do Nome
      const fullName = (record['NOME COMPLETO'] || '').trim();
      if (!fullName) continue;

      const nameArray = fullName.replace(/^\(\s*pastora\s*\)\s*/i, '').split(' ');
      const firstName = nameArray[0];
      const lastName = nameArray.slice(1).join(' ') || 'Fiel';

      // 2. Tratamento de Gênero
      const rawGender = (record['GÊNERO'] || '').toUpperCase();
      const gender = rawGender.startsWith('F') ? 'F' : 'M';

      // 3. Tratamento da Geração
      const rawGen = record['GERAÇÃO'] || '';
      const genMatch = rawGen.match(/F(\d+)/i);
      const generationSlot = genMatch ? parseInt(genMatch[1], 10) : null;

      // 4. Busca por Líder (Convidado por)
      const invitedBy = (record['CONVIDADO(A) POR'] || '').trim();
      let leaderId: string | null = null;

      if (invitedBy) {
        const leaderNameParts = invitedBy.split(' ');
        const lFirst = leaderNameParts[0];
        
        const [existingLeader] = await db
          .select({ id: members.id })
          .from(members)
          .where(and(
            eq(members.firstName, lFirst),
            eq(members.organizationId, orgId)
          ))
          .limit(1);
        
        if (existingLeader) {
          leaderId = existingLeader.id;
        }
      }

      // 5. Verificação de Duplicidade (Nome + Org)
      const [duplicate] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.firstName, firstName),
          eq(members.lastName, lastName),
          eq(members.organizationId, orgId)
        ))
        .limit(1);

      if (duplicate) {
        console.log(`- Pulando duplicado: ${firstName} ${lastName}`);
        skippedCount++;
        continue;
      }

      // 6. Inserção
      await db.insert(members).values({
        organizationId: orgId,
        firstName,
        lastName,
        gender,
        birthDate: new Date('1990-01-01'), // Placeholder (Obrigatório no schema)
        leaderId,
        lineage: rawGen, // Mantemos a descrição da geração no lineage para referência
        generationSlot,
        currentStep: 'UNIVERSITY_OF_LIFE', // Todos entram na Universidade da Vida
        isLeader: false,
        isBaptized: false,
      });

      importedCount++;
      if (importedCount % 10 === 0) console.log(`... processados ${importedCount} membros`);

    } catch (err) {
      console.error(`❌ Erro ao processar registro:`, record, err);
    }
  }

  console.log(`\n✅ Importação concluída!`);
  console.log(`- Sucesso: ${importedCount}`);
  console.log(`- Duplicados/Pulados: ${skippedCount}`);
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erro Fatal:', e);
  process.exit(1);
});
