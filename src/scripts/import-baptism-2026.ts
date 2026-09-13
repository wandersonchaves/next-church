import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { and, eq, ilike } from 'drizzle-orm';
import { db } from '../libs/DB';
import { WhatsAppService } from '../libs/services/WhatsAppService';
import { members } from '../models/Schema';
import 'dotenv/config';

/**
 * SCRIPT: Importação de Candidatos ao Batismo 2026
 *
 * Este script processa uma planilha CSV com:
 * Nome Completo | Telefone / Whatsapp | Geração
 *
 * Funcionalidades:
 * 1. Importa membros com a tag "BATISMO_2026".
 * 2. Identifica a Geração (F1, F10, etc).
 * 3. Tenta vincular ao Líder mencionado.
 * 4. Permite envio em massa opcional via WhatsApp.
 */

// CONFIGURAÇÕES
const SEND_WHATSAPP = false; // Mude para true para disparar mensagens
const ORG_ID = 'org_3AnSpFjJduHOXVTu191GR8W9Iu2'; // ID da Organização (TelePaz)
const BAPTISM_TAG = 'BATISMO_2026';
const DEFAULT_BIRTH_DATE = new Date('1900-01-01');
const WHATSAPP_MESSAGE_TEMPLATE = (name: string) =>
  `Olá ${name}! Estamos muito felizes com sua decisão. Este é um convite especial para o Batismo 2026. Em breve entraremos em contato com mais detalhes! 🙌`;

async function guessGender(name: string): Promise<'M' | 'F'> {
  const firstName = name.split(' ')[0].toLowerCase();
  const femaleEndings = ['a', 'ia', 'is', 'th', 'ice', 'riz'];
  const femaleNames = ['beatriz', 'alice', 'iris', 'ruth', 'ester', 'marta', 'noemi', 'raquel'];

  if (femaleNames.includes(firstName) || femaleEndings.some(e => firstName.endsWith(e))) {
    return 'F';
  }
  return 'M';
}

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function findLeaderId(genString: string, orgId: string): Promise<string | null> {
  // Ex: "F1 - Wilson e Cleide" -> ["Wilson", "Cleide"]
  const parts = genString.split('-')[1]?.trim().split(/ e | e\/| & /i) || [];
  if (parts.length === 0) {
    return null;
  }

  for (const name of parts) {
    const leaderName = name.trim().split(' ')[0];
    const [found] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(
        eq(members.organizationId, orgId),
        ilike(members.firstName, leaderName),
        eq(members.isLeader, true),
      ))
      .limit(1);

    if (found) {
      return found.id;
    }
  }
  return null;
}

async function run() {
  const filePath = 'BATISMO_2026_IMPORT.csv';

  if (!fs.existsSync(filePath)) {
    // Se não existir, vamos criar um exemplo com os dados fornecidos pelo usuário
    const exampleContent = `Nome Completo,Telefone / Whatsapp,Geração
Ana Beatriz da Cruz Silveira,86999355503,F1 - Wilson e Cleide
Ana Caroline Silva Oliveira,86994802983,F10 - Aurifran e Ana
Antonia Clara da Silva minha mãe,86994440768,F7 - Italo e Arlania
Antônia Marília da Costa Calaça,8699450-9165,F4 - Célia
Antonio Jose da Silva,86994440768,F7 - Italo e Arlania`;

    fs.writeFileSync(filePath, exampleContent);
    console.log(`📝 Criado arquivo de exemplo: ${filePath}`);
  }

  console.log('🚀 Iniciando Processamento de Batismo 2026...');

  const fileContent = fs.readFileSync(filePath, 'utf-8');

  type BaptismRecord = {
    'Nome Completo': string;
    'Telefone / Whatsapp': string;
    'Geração': string;
  };

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as BaptismRecord[];

  let count = 0;
  for (const record of records) {
    try {
      const fullName = record['Nome Completo'];
      const rawPhone = record['Telefone / Whatsapp'];
      const rawGen = record['Geração'];

      if (!fullName) {
        continue;
      }

      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Fiel';
      const phone = sanitizePhone(rawPhone);
      const gender = await guessGender(firstName);

      // Extrair slot de geração (F1 -> 1)
      const genMatch = rawGen.match(/F(\d+)/i);
      const generationSlot = genMatch ? Number.parseInt(genMatch[1], 10) : null;

      const leaderId = await findLeaderId(rawGen, ORG_ID);

      // Verificar duplicado
      const [existing] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.organizationId, ORG_ID),
          eq(members.firstName, firstName),
          eq(members.lastName, lastName),
        ))
        .limit(1);

      if (existing) {
        console.log(`- Atualizando tag para: ${firstName} ${lastName}`);
        await db.update(members)
          .set({ kidsNotes: BAPTISM_TAG })
          .where(eq(members.id, existing.id));
      } else {
        await db.insert(members).values({
          organizationId: ORG_ID,
          firstName,
          lastName,
          phone,
          gender,
          birthDate: DEFAULT_BIRTH_DATE,
          generationSlot,
          leaderId,
          kidsNotes: BAPTISM_TAG,
          currentStep: 'DECISION',
          isBaptized: false,
          lineage: rawGen,
        });

        console.log(`✅ Importado: ${firstName} ${lastName}`);
      }

      // Disparo de WhatsApp
      if (SEND_WHATSAPP && phone) {
        console.log(`   [WA] Enviando para ${phone}...`);
        await WhatsAppService.sendMessage({
          phone,
          message: WHATSAPP_MESSAGE_TEMPLATE(firstName),
          organizationId: ORG_ID,
        });
      }

      count++;
    } catch (err) {
      console.error(`❌ Erro no registro ${record['Nome Completo']}:`, err);
    }
  }

  console.log(`\n🎉 Finalizado! ${count} registros processados.`);
  process.exit(0);
}

run().catch(console.error);
