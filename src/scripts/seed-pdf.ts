import 'dotenv/config';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { db } from '../libs/DB';
import { members, ministries, memberMinistries, journeyHistory, memberJourneys, notificationLogs } from '../models/Schema';
import { eq, inArray } from 'drizzle-orm';

async function run() {
  const orgId = "org_3AnSpFjJduHOXVTu191GR8W9Iu2";

  console.log('Lendo PDF e realizando limpeza de dados antigos para a org correta...');
  
  const existingMembers = await db.select({ id: members.id }).from(members).where(eq(members.organizationId, orgId));
  const memberIds = existingMembers.map(m => m.id);

  if (memberIds.length > 0) {
    await db.delete(journeyHistory).where(inArray(journeyHistory.memberId, memberIds));
    await db.delete(memberMinistries).where(inArray(memberMinistries.memberId, memberIds));
    await db.delete(memberJourneys).where(eq(memberJourneys.organizationId, orgId));
    await db.delete(notificationLogs).where(eq(notificationLogs.organizationId, orgId));
  }
  await db.delete(members).where(eq(members.organizationId, orgId));
  await db.delete(ministries).where(eq(ministries.organizationId, orgId));

  const dataBuffer = fs.readFileSync('MEMBROS_FILADELFIA_SEDE.pdf');
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  const text = data.text;
  await parser.destroy();
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
  const parsedMembers: any[] = [];
  const ministrySet = new Set<string>();

  const knownMinistries = [
    'RECEPÇÃO INTERNA', 'RECEPÇÃO EXTERNA', 'INTERCESSORES / OBREIROS',
    'APOIO', 'PROTOCOLO', 'SOM E MÍDIA', 'CRIATIVO', 'FILADÉLFIA KIDS',
    'FILADÉLFIA TV', 'SEGURANÇA / ESTACIONAMENTO'
  ];
  
  for (const line of lines) {
    if (line.match(/Nome Completo|Página|^\[\d+\]/i)) continue;

    try {
      let raw = line;

      // 1. Extrair Sexo e Data de Nascimento (Final da linha)
      let gender: "M" | "F" = 'M';
      if (raw.match(/HOMEM$/)) { gender = 'M'; raw = raw.replace(/HOMEM$/, '').trim(); }
      else if (raw.match(/MULHER$/)) { gender = 'F'; raw = raw.replace(/MULHER$/, '').trim(); }

      let dob = '1900-01-01';
      const dobMatch = raw.match(/(\d{2}\/\d{2}\/\d{4})$/);
      if (dobMatch) {
        const p = dobMatch[1].split('/');
        dob = `${p[2]}-${p[1]}-${p[0]}`;
        raw = raw.replace(dobMatch[1], '').trim();
      }

      // 2. Extrair Telefone e Separar Nome da Geração/Líder
      const phoneMatch = raw.match(/(\d{10,12})/);
      let namePart = "";
      let remaining = "";

      if (phoneMatch) {
        const phone = phoneMatch[1];
        const splitParts = raw.split(phone);
        namePart = splitParts[0].trim();
        remaining = splitParts[1]?.trim() || "";
        
        // 3. Extrair Geração (Ex: F3 - JHONNY E ELIS ou OUTROS)
        let lineage = "";
        let generationSlot: number | null = null;

        // Padrão: Começa com F + número ou a palavra OUTROS
        const genMatch = remaining.match(/(F\d+\s*-[^,]+|OUTROS)/i);
        if (genMatch) {
          lineage = genMatch[0].trim();
          const slot = lineage.match(/F(\d+)/i);
          if (slot) generationSlot = parseInt(slot[1], 10);
        }

        // 4. Extrair Ministério e Papel
        let ministryName = null;
        let role = 'VOLUNTÁRIO';
        for (const m of knownMinistries) {
          if (remaining.toUpperCase().includes(m)) {
            ministryName = m;
            const roleMatch = remaining.match(new RegExp(`${m}[^:]*:\\s*([^\\.,]+)`, 'i'));
            if (roleMatch) role = roleMatch[1].trim();
            break;
          }
        }
        if (ministryName) ministrySet.add(ministryName);

        // 5. Limpar Nome
        const fullName = namePart.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
        const nameArray = fullName.split(' ');
        const firstName = nameArray[0];
        const lastName = nameArray.slice(1).join(' ');

        if (firstName) {
          parsedMembers.push({
            firstName, lastName, phone, birthDate: new Date(dob),
            gender, lineage, generationSlot, ministryName, role
          });
        }
      }
    } catch (err) {}
  }

  console.log(`Dados extraídos com sucesso: ${parsedMembers.length} membros.`);

  await db.transaction(async (tx) => {
    const ministryIdMap = new Map<string, string>();
    for (const mName of ministrySet) {
      const [min] = await tx.insert(ministries).values({
        organizationId: orgId,
        name: mName,
        description: `Ministério de ${mName}`
      }).returning();
      ministryIdMap.set(mName, min.id);
    }
    
    for (const m of parsedMembers) {
      const [newMember] = await tx.insert(members).values({
        organizationId: orgId,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        birthDate: m.birthDate,
        gender: m.gender,
        lineage: m.lineage, // Aqui agora salva "F3 - JHONNY E ELIS"
        generationSlot: m.generationSlot, // Aqui agora salva "3"
        currentStep: 'DECISION',
        isLeader: false,
        isBaptized: false
      }).returning();

      if (m.ministryName && newMember) {
        const minId = ministryIdMap.get(m.ministryName);
        if (minId) {
          await tx.insert(memberMinistries).values({
            memberId: newMember.id,
            ministryId: minId,
            role: m.role.substring(0, 50),
          }).onConflictDoNothing();
        }
      }
    }
  });
  
  console.log('✅ Migração Concluída! Membros, Gerações e Ministérios importados.');
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erro Crítico:', e);
  process.exit(1);
});
