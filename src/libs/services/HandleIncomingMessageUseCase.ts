import { and, eq, gte, ilike, isNull, or } from 'drizzle-orm';
import { analyzeMessageWithAI, extractNameFromText, isInvalidName } from '@/libs/AIOrchestratorEngine';
import { db } from '@/libs/DB';
import { NotificationService } from '@/libs/services/NotificationService';
import { WhatsAppService } from '@/libs/services/WhatsAppService';
import { auditLogs, memberMinistries, members, ministries, notificationLogs } from '@/models/Schema';

/**
 * Logs a system-level activity to audit logs since Clerk's auth() is unavailable in background tasks.
 * @param params - Audit payload parameters.
 * @param params.organizationId - Target organization ID.
 * @param params.action - Mutation action type.
 * @param params.entityType - Affected entity domain.
 * @param params.entityName - Human-readable entity description.
 */
async function logSystemActivity(params: {
  organizationId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PROMOTE';
  entityType: 'MEMBER' | 'MINISTRY' | 'TEAM';
  entityName: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      userId: 'system-ai-agent',
      userName: 'NextChurch AI Agent',
      action: params.action,
      entityType: params.entityType,
      entityName: params.entityName,
    });
  } catch (error) {
    console.error('[AUDIT_SYSTEM_LOG_ERROR]', error);
  }
}

/**
 * Normalizes a phone number to digits only, removing JID suffix if present.
 * @param phone - Phone number or WhatsApp JID.
 */
function cleanPhoneDigits(phone: string): string {
  return phone.split('@')[0].replace(/\D/g, '');
}

/**
 * Checks whether an incoming message is an explicit opt-out request from communications.
 * @param text - Raw message string.
 * @returns True if text explicitly requests to stop receiving messages.
 */
export function isExplicitOptOutMessage(text: string): boolean {
  const clean = text.replace(/\[.*?\]/g, '').trim().toLowerCase();
  const optOutPhrases = [
    'parar',
    'stop',
    'sair',
    'não quero receber',
    'nao quero receber',
    'não quero mais receber',
    'nao quero mais receber',
    'não envie mais',
    'nao envie mais',
    'não mande mais',
    'nao mande mais',
    'não mande mensagem',
    'nao mande mensagem',
    'não envie mensagem',
    'nao envie mensagem',
    'não quero mensagens',
    'nao quero mensagens',
    'não quero mais mensagens',
    'nao quero mais mensagens',
    'remova meu número',
    'remova meu numero',
    'remover meu número',
    'remover meu numero',
    'remova meu contato',
    'remover meu contato',
    'tire meu número',
    'tire meu numero',
    'cancele mensagens',
    'cancelar mensagens',
    'cancelar comunicacao',
    'cancelar comunicação',
  ];

  return optOutPhrases.some(phrase =>
    clean === phrase
    || clean.startsWith(`${phrase} `)
    || clean.endsWith(` ${phrase}`)
    || clean.includes(phrase),
  );
}

/**
 * Checks whether the incoming message contests or rejects candidate registration data.
 * @param text - Raw message string.
 * @returns True if the message contests data without being an opt-out.
 */
export function isDataContestation(text: string): boolean {
  const clean = text.replace(/\[.*?\]/g, '').trim().toLowerCase();
  if (
    clean === 'não'
    || clean === 'nao'
    || clean === 'não não'
    || clean === 'nao nao'
  ) {
    return true;
  }

  const contestationPhrases = [
    'está errado',
    'esta errado',
    'tá errado',
    'ta errado',
    'não está certo',
    'nao esta certo',
    'não tá certo',
    'nao ta certo',
    'não confirmo',
    'nao confirmo',
    'dados errados',
    'dados incorretos',
    'nome errado',
    'não é esse',
    'nao e esse',
    'não é esse nome',
    'nao e esse nome',
    'informação errada',
    'informacao errada',
    'incorreto',
  ];

  return contestationPhrases.some(phrase => clean.includes(phrase));
}

/**
 * Builds the WhatsApp confirmation prompt requesting member confirmation of updated data and opt-in consent.
 * @param params - Candidate fields to confirm.
 * @param params.name - Proposed member name.
 * @param params.email - Proposed member email.
 * @param params.address - Proposed member address.
 * @param params.generation - Proposed member generation slot.
 * @param params.ministries - Proposed member ministries.
 * @param params.isApology - Whether to prefix with apologies (true for wrong number/negation).
 * @returns Formatted prompt string for WhatsApp.
 */
function buildConfirmationPrompt(params: {
  name?: string;
  email?: string;
  address?: string;
  generation?: number;
  ministries?: string[];
  isApology?: boolean;
}): string {
  const lines: string[] = [];

  if (params.isApology) {
    lines.push('Pedimos sinceras desculpas pelo engano! 🙏');
    lines.push('');
    lines.push('Identificamos a seguinte solicitação de atualização no cadastro:');
  } else {
    lines.push('Identificamos a seguinte solicitação de atualização no cadastro:');
  }

  if (params.name) {
    lines.push(`👤 *Nome:* ${params.name}`);
  }
  if (params.email) {
    lines.push(`📧 *E-mail:* ${params.email}`);
  }
  if (params.address) {
    lines.push(`📍 *Endereço:* ${params.address}`);
  }
  if (params.generation) {
    lines.push(`👥 *Geração:* Geração ${params.generation}`);
  }
  if (params.ministries && params.ministries.length > 0) {
    lines.push(`🏛️ *Ministérios:* ${params.ministries.join(', ')}`);
  }

  lines.push('');
  lines.push('Você confirma esses dados e gostaria de continuar recebendo mensagens e programações da nossa igreja por aqui?');
  lines.push('');
  lines.push('• Responda *Sim* para confirmar.');
  lines.push('• Se algum dado estiver incorreto, envie a *correção*.');
  lines.push('• Responda *Parar* caso não queira receber nossas mensagens.');

  return lines.join('\n');
}

/**
 * Extracts proposed registration values from a previous confirmation prompt message.
 * @param content - Text content of the prompt message.
 */
function extractPendingDataFromPrompt(content: string): {
  pendingName?: string;
  pendingEmail?: string;
  pendingAddress?: string;
  pendingGeneration?: number;
  pendingMinistries?: string[];
} {
  let pendingName: string | undefined;
  let pendingEmail: string | undefined;
  let pendingAddress: string | undefined;
  let pendingGeneration: number | undefined;
  let pendingMinistries: string[] | undefined;

  const nameMatch = content.match(/👤\s*\*Nome:\*\s*([^\n]+)/iu);
  if (nameMatch?.[1]) {
    const raw = nameMatch[1].trim();
    if (raw && !isInvalidName(raw)) {
      pendingName = raw;
    }
  }

  const emailMatch = content.match(/📧\s*\*E-mail:\*\s*([^\n]+)/iu);
  if (emailMatch?.[1] && !emailMatch[1].includes('Não informado')) {
    pendingEmail = emailMatch[1].trim();
  }

  const addressMatch = content.match(/📍\s*\*Endereço:\*\s*([^\n]+)/iu);
  if (addressMatch?.[1] && !addressMatch[1].includes('Não informado')) {
    pendingAddress = addressMatch[1].trim();
  }

  const genMatch = content.match(/👥\s*\*Geração:\*\s*Geração\s*(\d+)/iu);
  if (genMatch?.[1]) {
    const slot = Number.parseInt(genMatch[1], 10);
    if (slot >= 1 && slot <= 12) {
      pendingGeneration = slot;
    }
  }

  const minMatch = content.match(/🏛️\s*\*Ministérios:\*\s*([^\n]+)/iu);
  if (minMatch?.[1]) {
    const list = minMatch[1]
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    if (list.length > 0) {
      pendingMinistries = list;
    }
  }

  return { pendingName, pendingEmail, pendingAddress, pendingGeneration, pendingMinistries };
}

/**
 * Fallback to extract pending data from recent notification logs.
 * @param logs - Array of recent notification logs.
 */
function extractPendingDataFromLogs(logs: Array<{ content: string; type: string }>): {
  pendingName?: string;
  pendingEmail?: string;
  pendingAddress?: string;
  pendingGeneration?: number;
  pendingMinistries?: string[];
} {
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log && log.type === 'WHATSAPP_OUTGOING') {
      const parsed = extractPendingDataFromPrompt(log.content);
      if (
        parsed.pendingName
        || parsed.pendingEmail
        || parsed.pendingAddress
        || parsed.pendingGeneration
        || parsed.pendingMinistries
      ) {
        return parsed;
      }
    }
  }

  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log && log.type === 'WHATSAPP_INCOMING') {
      const extracted = extractNameFromText(log.content);
      if (extracted && !isInvalidName(extracted)) {
        return { pendingName: extracted };
      }
    }
  }

  return {};
}

/**
 * Safely associates or disassociates a member with ministries belonging to their organization.
 * Strictly scoped to the organization and defaults role to 'VOLUNTÁRIO'.
 * @param params - Configuration object.
 * @param params.memberId - Unique member identifier.
 * @param params.organizationId - Tenant organization ID.
 * @param params.ministryActions - List of ministries and actions ('ADD' | 'REMOVE').
 * @returns Array of affected ministry names.
 */
async function syncMemberMinistries(params: {
  memberId: string;
  organizationId: string;
  ministryActions: Array<{ name: string; action: 'ADD' | 'REMOVE' }>;
}): Promise<string[]> {
  const updatedMinistries: string[] = [];

  const orgMinistries = await db
    .select({ id: ministries.id, name: ministries.name })
    .from(ministries)
    .where(eq(ministries.organizationId, params.organizationId));

  for (const actionItem of params.ministryActions) {
    const normalizedTarget = actionItem.name.trim().toLowerCase();
    if (!normalizedTarget) {
      continue;
    }

    const matched = orgMinistries.find((m) => {
      const dbName = m.name.toLowerCase();
      return dbName.includes(normalizedTarget) || normalizedTarget.includes(dbName);
    });

    if (!matched) {
      continue;
    }

    if (actionItem.action === 'ADD') {
      const existing = await db.query.memberMinistries.findFirst({
        where: and(
          eq(memberMinistries.memberId, params.memberId),
          eq(memberMinistries.ministryId, matched.id),
        ),
      });

      if (!existing) {
        await db.insert(memberMinistries).values({
          memberId: params.memberId,
          ministryId: matched.id,
          role: 'VOLUNTÁRIO',
          joinedAt: new Date(),
        });
      }
      updatedMinistries.push(matched.name);
    } else if (actionItem.action === 'REMOVE') {
      await db
        .delete(memberMinistries)
        .where(
          and(
            eq(memberMinistries.memberId, params.memberId),
            eq(memberMinistries.ministryId, matched.id),
          ),
        );
      updatedMinistries.push(`Removido(a) de ${matched.name}`);
    }
  }

  return updatedMinistries;
}

/**
 * Sends a WhatsApp message and persists it to notification logs.
 * @param params - Message sending payload.
 * @param params.phone - Recipient phone or WhatsApp JID.
 * @param params.message - Message text content.
 * @param params.organizationId - Organization tenant ID.
 */
async function sendAndLogWhatsAppMessage(params: {
  phone: string;
  message: string;
  organizationId: string;
}): Promise<void> {
  await WhatsAppService.sendMessage({
    phone: params.phone,
    message: params.message,
    organizationId: params.organizationId,
  });

  await NotificationService.saveOutgoingMessage({
    phone: params.phone,
    content: params.message,
    organizationId: params.organizationId,
    status: 'SENT',
  });
}

/**
 * Core use case to handle conversational validation and auto-correction of member registration.
 * @param params - Incoming message parameters.
 * @param params.sender - WhatsApp JID of sender.
 * @param params.content - Text content received.
 * @param params.organizationId - Tenant organization ID.
 */
export async function handleIncomingMessageUseCase(params: {
  sender: string; // WhatsApp JID (e.g., 5586994037788@s.whatsapp.net)
  content: string;
  organizationId: string;
}): Promise<{ status: string }> {
  const { sender, content, organizationId } = params;

  console.warn(`[HANDLE_INCOMING_MSG] Processing message from ${sender} (Org: ${organizationId})`);

  // 1. Resolve o membro pelo número de telefone
  const member = await NotificationService.findMemberByPhone(sender);

  // 🛑 TRAVA DE DUPLICIDADE: Se a última mensagem recebida já foi respondida (evita envio duplo Direct + Inngest)
  const cleanPhone = cleanPhoneDigits(sender);
  const latestIncoming = await db.query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.organizationId, organizationId),
      eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
      member?.id
        ? eq(notificationLogs.memberId, member.id)
        : or(
            ilike(notificationLogs.content, `[De: ${cleanPhone}]%`),
            ilike(notificationLogs.content, `[De: ${sender.split('@')[0]}]%`),
          ),
    ),
    orderBy: (log, { desc }) => [desc(log.sentAt)],
  });

  const recentReplyWindow = new Date(Date.now() - 15 * 1000);
  const outgoingThreshold = latestIncoming?.sentAt ?? recentReplyWindow;

  const alreadyReplied = await db.query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.organizationId, organizationId),
      eq(notificationLogs.type, 'WHATSAPP_OUTGOING'),
      member?.id
        ? eq(notificationLogs.memberId, member.id)
        : or(
            ilike(notificationLogs.content, `[Para: ${cleanPhone}]%`),
            ilike(notificationLogs.content, `[Para: ${sender.split('@')[0]}]%`),
          ),
      gte(notificationLogs.sentAt, outgoingThreshold),
    ),
  });

  if (alreadyReplied) {
    console.warn(`[HANDLE_INCOMING_MSG] >>> SKIP: Recent outgoing message already sent to ${sender}.`);
    return { status: 'skipped_recent_outgoing' };
  }

  // 2. Busca histórico recente de mensagens nos últimos 15 minutos para acumular contexto
  const contextWindow = new Date(Date.now() - 15 * 60 * 1000);
  let recentLogs: any[] = [];

  if (member) {
    recentLogs = await db
      .select()
      .from(notificationLogs)
      .where(and(
        eq(notificationLogs.memberId, member.id),
        gte(notificationLogs.sentAt, contextWindow),
      ))
      .orderBy(notificationLogs.sentAt);
  } else {
    const cleanPhone = sender.split('@')[0];
    recentLogs = await db
      .select()
      .from(notificationLogs)
      .where(and(
        isNull(notificationLogs.memberId),
        ilike(notificationLogs.content, `[De: ${cleanPhone}]%`),
        gte(notificationLogs.sentAt, contextWindow),
      ))
      .orderBy(notificationLogs.sentAt);
  }

  // Combina apenas as mensagens recebidas para passar à IA
  const incomingLogs = recentLogs.filter(log => log.type === 'WHATSAPP_INCOMING');
  const combinedContent = incomingLogs.length > 0
    ? incomingLogs.map(log => log.content).join('\n')
    : content;

  console.warn(`[HANDLE_INCOMING_MSG] Context: ${combinedContent}`);

  // Se o membro existe
  if (member) {
    const currentStatus = member.status || 'ACTIVE';
    const memberFullName = `${member.firstName} ${member.lastName}`.trim();
    const cleanPhone = cleanPhoneDigits(sender);

    console.warn(`[HANDLE_INCOMING_MSG] Found member: ${memberFullName} (Status: ${currentStatus})`);

    const result = await analyzeMessageWithAI(content, memberFullName, combinedContent);
    if (result.detectedName && isInvalidName(result.detectedName)) {
      result.detectedName = undefined;
    }
    console.warn(`[HANDLE_INCOMING_MSG] AI Intent analysis result:`, result);

    // 🛑 REGRA 1: Opt-Out Imediato
    const explicitOptOut = isExplicitOptOutMessage(content);
    const dataContestation = isDataContestation(content);

    // Somente aciona se for uma recusa explícita de comunicação ("Parar", "Não quero receber mensagens", etc.)
    // NUNCA acionar se for contestação de dados ou se um novo nome tiver sido detectado!
    const shouldOptOut = (
      explicitOptOut
      || (result.detectedOptIn === false && !dataContestation && !result.detectedName)
    );

    if (shouldOptOut) {
      await db
        .update(members)
        .set({
          status: 'UPDATED',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Membro ${memberFullName} optou por não receber mensagens (Opt-Out registrado)`,
      });

      const optOutMsg = `Compreendido perfeitamente! Respeitamos sua escolha e não enviaremos mais mensagens por aqui. Se precisar de algo no futuro, estaremos sempre à disposição. Tenha um excelente dia! 🙏`;

      await sendAndLogWhatsAppMessage({
        phone: sender,
        message: optOutMsg,
        organizationId,
      });

      return { status: 'handled_opt_out' };
    }

    // 🔄 REGRA 2: Membro em AWAITING_UPDATE (aguardando confirmação dos dados ou resposta de opt-in)
    if (currentStatus === 'AWAITING_UPDATE') {
      // 2.1 Se confirmou Opt-In / Atualização ("Sim", "Confirmo", "Pode mandar", "Aceito", "Gostaria sim")
      if (result.detectedOptIn === true || result.intent === 'CONFIRMED') {
        const lastPromptLog = await db.query.notificationLogs.findFirst({
          where: and(
            eq(notificationLogs.organizationId, organizationId),
            eq(notificationLogs.memberId, member.id),
            eq(notificationLogs.type, 'WHATSAPP_OUTGOING'),
            ilike(notificationLogs.content, '%Identificamos a seguinte solicitação%'),
          ),
          orderBy: (log, { desc }) => [desc(log.sentAt)],
        });

        const pending = lastPromptLog
          ? extractPendingDataFromPrompt(lastPromptLog.content)
          : extractPendingDataFromLogs(recentLogs);

        let finalFirstName = member.firstName;
        let finalLastName = member.lastName;

        if (pending.pendingName) {
          const parts = pending.pendingName.trim().split(' ');
          finalFirstName = parts[0] || member.firstName;
          finalLastName = parts.slice(1).join(' ') || '';
        }

        const finalEmail = pending.pendingEmail || member.email;
        const finalAddress = pending.pendingAddress || member.address;
        const finalGeneration = pending.pendingGeneration ?? member.generationSlot;

        await db
          .update(members)
          .set({
            firstName: finalFirstName,
            lastName: finalLastName,
            email: finalEmail,
            address: finalAddress,
            generationSlot: finalGeneration,
            phone: member.phone || cleanPhone,
            status: 'ACTIVE',
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));

        const confirmedMinistries: string[] = [];
        if (pending.pendingMinistries && pending.pendingMinistries.length > 0) {
          const actions = pending.pendingMinistries.map(name => ({ name, action: 'ADD' as const }));
          const synced = await syncMemberMinistries({
            memberId: member.id,
            organizationId,
            ministryActions: actions,
          });
          confirmedMinistries.push(...synced);
        }

        const displayName = `${finalFirstName} ${finalLastName}`.trim();

        await logSystemActivity({
          organizationId,
          action: 'UPDATE',
          entityType: 'MEMBER',
          entityName: `Cadastro confirmado e ativado: ${displayName}`,
        });

        const welcomeLines = [
          `🙌 *Cadastro Atualizado e Confirmado!* Obrigado por nos ajudar a manter seus dados corretos.`,
          ``,
          `Confirmamos os seguintes dados no sistema:`,
          `👤 *Nome:* ${displayName}`,
          `📧 *E-mail:* ${finalEmail || 'Não informado'}`,
          `📍 *Endereço:* ${finalAddress || 'Não informado'}`,
        ];

        if (finalGeneration) {
          welcomeLines.push(`👥 *Geração:* Geração ${finalGeneration}`);
        }
        if (confirmedMinistries.length > 0) {
          welcomeLines.push(`🏛️ *Ministérios:* ${confirmedMinistries.join(', ')}`);
        }

        welcomeLines.push(``);

        const missingFields: string[] = [];
        if (!finalEmail) {
          missingFields.push('e-mail');
        }
        if (!finalAddress) {
          missingFields.push('endereço');
        }
        if (!finalGeneration) {
          missingFields.push('geração');
        }
        if (missingFields.length > 0) {
          welcomeLines.push(`💡 *Dica:* Quando quiser, você pode nos enviar seu ${missingFields.join(', ')} ou ministérios que participa para completar seu cadastro!`);
          welcomeLines.push(``);
        }

        welcomeLines.push(`Seja muito bem-vindo(a)! Que Deus abençoe sua vida! ✨`);

        await sendAndLogWhatsAppMessage({
          phone: sender,
          message: welcomeLines.join('\n'),
          organizationId,
        });

        return { status: 'awaiting_update_confirmed_opt_in' };
      }

      // 2.2 Se informou novos dados enquanto aguardava confirmação (ex: "Natalia Chaves", "Me chamo Wanderson", "Rua Ferroviaria, 8400", "Geração 3", "Louvor")
      const candidateMinistries = result.detectedMinistries?.filter(m => m.action === 'ADD').map(m => m.name);
      if (
        result.detectedName
        || result.detectedEmail
        || result.detectedAddress
        || result.detectedGeneration
        || (candidateMinistries && candidateMinistries.length > 0)
      ) {
        const confirmPrompt = buildConfirmationPrompt({
          name: result.detectedName,
          email: result.detectedEmail,
          address: result.detectedAddress,
          generation: result.detectedGeneration,
          ministries: candidateMinistries,
          isApology: false,
        });

        await logSystemActivity({
          organizationId,
          action: 'UPDATE',
          entityType: 'MEMBER',
          entityName: `Aguardando confirmação para atualizar cadastro de ${memberFullName}`,
        });

        await sendAndLogWhatsAppMessage({
          phone: sender,
          message: confirmPrompt,
          organizationId,
        });

        return { status: 'name_updated_awaiting_opt_in' };
      }

      // 2.3 Se contestou os dados ou disse "Não" sem enviar a informação correta ainda
      if (dataContestation || result.intent === 'OUTDATED_DATA') {
        const clarificationMsg = [
          'Pedimos sinceras desculpas pelo erro! 🙏',
          '',
          'Como deveríamos registrar seu nome completo, e-mail, endereço, geração ou ministério corretamente? Por favor, envie a informação correta para atualizarmos seu cadastro.',
        ].join('\n');

        await logSystemActivity({
          organizationId,
          action: 'UPDATE',
          entityType: 'MEMBER',
          entityName: `Membro ${memberFullName} contestou os dados em confirmação. Solicitado envio dos dados corretos.`,
        });

        await sendAndLogWhatsAppMessage({
          phone: sender,
          message: clarificationMsg,
          organizationId,
        });

        return { status: 'awaiting_data_clarification' };
      }
    }

    // ⚠️ REGRA 3: Mensagem de Número Errado Inicial (WRONG_NUMBER)
    if (result.intent === 'WRONG_NUMBER') {
      await db
        .update(members)
        .set({
          phone: member.phone || cleanPhone,
          status: 'AWAITING_UPDATE',
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      const candidateMinistries = result.detectedMinistries?.filter(m => m.action === 'ADD').map(m => m.name);

      if (
        result.detectedName
        || result.detectedEmail
        || result.detectedAddress
        || result.detectedGeneration
        || (candidateMinistries && candidateMinistries.length > 0)
      ) {
        const confirmPrompt = buildConfirmationPrompt({
          name: result.detectedName,
          email: result.detectedEmail,
          address: result.detectedAddress,
          generation: result.detectedGeneration,
          ministries: candidateMinistries,
          isApology: true,
        });

        await logSystemActivity({
          organizationId,
          action: 'UPDATE',
          entityType: 'MEMBER',
          entityName: `Aguardando confirmação para atualizar cadastro de ${memberFullName} para ${result.detectedName || 'novos dados'}`,
        });

        await sendAndLogWhatsAppMessage({
          phone: sender,
          message: confirmPrompt,
          organizationId,
        });

        return { status: 'handled_wrong_number_with_name' };
      }

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Cadastro de ${memberFullName} colocado em AWAITING_UPDATE para identificação da nova pessoa`,
      });

      const askNameMsg = `Pedimos sinceras desculpas pelo engano! 🙏 Já estamos atualizando seu cadastro.\n\nPoderia nos dizer qual é o seu nome completo? E você gostaria de continuar recebendo mensagens e convites da nossa igreja por aqui?`;

      await sendAndLogWhatsAppMessage({
        phone: sender,
        message: askNameMsg,
        organizationId,
      });

      return { status: 'handled_wrong_number_awaiting_name' };
    }

    // ✏️ REGRA 4: Dados Desatualizados / Atualização de Cadastro
    // 4.1: Mudança de Nome ou Identidade Diferente (ex: "Não me chamo Gabriel, sou Wanderson Chaves")
    const isNameDifferent = Boolean(
      result.detectedName
      && !isInvalidName(result.detectedName)
      && result.detectedName.trim().toLowerCase() !== member.firstName.trim().toLowerCase(),
    );

    if (isNameDifferent) {
      await db
        .update(members)
        .set({
          phone: member.phone || cleanPhone,
          status: 'AWAITING_UPDATE',
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Aguardando confirmação para atualizar nome de ${memberFullName} para ${result.detectedName}`,
      });

      const candidateMinistries = result.detectedMinistries?.filter(m => m.action === 'ADD').map(m => m.name);
      const confirmPrompt = buildConfirmationPrompt({
        name: result.detectedName,
        email: result.detectedEmail,
        address: result.detectedAddress,
        generation: result.detectedGeneration,
        ministries: candidateMinistries,
        isApology: false,
      });

      await sendAndLogWhatsAppMessage({
        phone: sender,
        message: confirmPrompt,
        organizationId,
      });

      return { status: 'member_data_corrected' };
    }

    // 4.2: Atualização Direta de Dados Complementares para Membro Ativo (E-mail, Endereço, Geração 1-12, Ministérios)
    // Sem passar pelo ritual de AWAITING_UPDATE ou exigir "Sim/Não/Parar" se o membro já é ativo e seu nome não mudou!
    const hasComplementaryData = Boolean(
      result.detectedEmail
      || result.detectedAddress
      || (result.detectedGeneration && result.detectedGeneration >= 1 && result.detectedGeneration <= 12)
      || (result.detectedMinistries && result.detectedMinistries.length > 0),
    );

    if (hasComplementaryData) {
      const updatePayload: Partial<{
        email: string;
        address: string;
        generationSlot: number;
        updatedAt: Date;
      }> = {
        updatedAt: new Date(),
      };

      const updatedFieldsList: string[] = [];

      if (result.detectedEmail) {
        updatePayload.email = result.detectedEmail;
        updatedFieldsList.push(`📧 *E-mail:* ${result.detectedEmail}`);
      }

      if (result.detectedAddress) {
        updatePayload.address = result.detectedAddress;
        updatedFieldsList.push(`📍 *Endereço:* ${result.detectedAddress}`);
      }

      // Validação estrita de Geração (apenas slots inteiros de 1 a 12)
      if (
        result.detectedGeneration
        && Number.isInteger(result.detectedGeneration)
        && result.detectedGeneration >= 1
        && result.detectedGeneration <= 12
      ) {
        updatePayload.generationSlot = result.detectedGeneration;
        updatedFieldsList.push(`👥 *Geração:* Geração ${result.detectedGeneration}`);
      }

      // Executa mutação no membro (apenas no próprio registro e tenant)
      await db
        .update(members)
        .set(updatePayload)
        .where(and(eq(members.id, member.id), eq(members.organizationId, organizationId)));

      // Sincroniza ministérios se informados (apenas ministérios existentes do tenant, como VOLUNTÁRIO)
      if (result.detectedMinistries && result.detectedMinistries.length > 0) {
        const synced = await syncMemberMinistries({
          memberId: member.id,
          organizationId,
          ministryActions: result.detectedMinistries,
        });
        for (const m of synced) {
          updatedFieldsList.push(`🏛️ *Ministério:* ${m}`);
        }
      }

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Dados complementares atualizados diretamente para ${memberFullName}`,
      });

      const confirmationReply = [
        `Dados atualizados com sucesso no seu cadastro! ✅`,
        ``,
        ...updatedFieldsList,
        ``,
        `Se precisar atualizar mais alguma informação, é só nos mandar por aqui! 🙏`,
      ].join('\n');

      await sendAndLogWhatsAppMessage({
        phone: sender,
        message: confirmationReply,
        organizationId,
      });

      return { status: 'member_data_updated_direct' };
    }

    // 4.3: Mensagem indicando dados desatualizados mas sem nenhum dado identificado ainda
    if (result.intent === 'OUTDATED_DATA') {
      await db
        .update(members)
        .set({
          status: 'AWAITING_UPDATE',
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Status de ${memberFullName} alterado para AWAITING_UPDATE`,
      });

      const responseMsg = `Peço desculpas pelo transtorno! Qual seria o seu nome completo, e-mail ou endereço atualizado para que possamos corrigir no seu cadastro aqui?`;

      await sendAndLogWhatsAppMessage({
        phone: sender,
        message: responseMsg,
        organizationId,
      });

      return { status: 'awaiting_update_prompt_sent' };
    }

    // ✅ REGRA 5: Confirmação de Membro Ativo (CONFIRMED)
    if (result.intent === 'CONFIRMED') {
      if (member.status !== 'ACTIVE') {
        await db
          .update(members)
          .set({
            status: 'ACTIVE',
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));
      }
      return { status: 'member_confirmed' };
    }

    return { status: 'other_intent_ignored' };
  }

  console.warn(`[HANDLE_INCOMING_MSG] Sender ${sender} does not match any registered member.`);
  return { status: 'no_member_matched' };
}
