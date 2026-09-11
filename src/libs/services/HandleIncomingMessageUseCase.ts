import { and, eq, gte, ilike, isNull, or } from 'drizzle-orm';
import { analyzeMessageWithAI } from '@/libs/AIOrchestratorEngine';
import { db } from '@/libs/DB';
import { NotificationService } from '@/libs/services/NotificationService';
import { WhatsAppService } from '@/libs/services/WhatsAppService';
import { auditLogs, members, notificationLogs } from '@/models/Schema';

/**
 * Logs a system-level activity to audit logs since Clerk's auth() is unavailable in background tasks.
 * @param params
 * @param params.organizationId
 * @param params.action
 * @param params.entityType
 * @param params.entityName
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
 * @param phone
 */
function cleanPhoneDigits(phone: string): string {
  return phone.split('@')[0].replace(/\D/g, '');
}

/**
 * Core use case to handle conversational validation and auto-correction of member registration.
 * @param params
 * @param params.sender
 * @param params.content
 * @param params.organizationId
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

  // 🛑 TRAVA DE DUPLICIDADE: Se já enviamos uma resposta recente (últimos 15 segundos) para esse membro/remetente, ignora execução duplicada (evita envio duplo Direct + Inngest)
  const recentReplyWindow = new Date(Date.now() - 15 * 1000);
  const cleanPhone = cleanPhoneDigits(sender);
  const recentOutgoing = await db.query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.organizationId, organizationId),
      eq(notificationLogs.type, 'WHATSAPP_OUTGOING'),
      member?.id
        ? eq(notificationLogs.memberId, member.id)
        : or(
            ilike(notificationLogs.content, `[Para: ${cleanPhone}]%`),
            ilike(notificationLogs.content, `[Para: ${sender.split('@')[0]}]%`),
          ),
      gte(notificationLogs.sentAt, recentReplyWindow),
    ),
  });

  if (recentOutgoing) {
    console.warn(`[HANDLE_INCOMING_MSG] >>> SKIP: Recent outgoing message already sent to ${sender} within last 15s.`);
    return { status: 'skipped_recent_outgoing' };
  }

  // 2. Busca histórico recente de mensagens nos últimos 5 minutos para acumular contexto
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  let recentLogs: any[] = [];

  if (member) {
    recentLogs = await db
      .select()
      .from(notificationLogs)
      .where(and(
        eq(notificationLogs.memberId, member.id),
        eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
        gte(notificationLogs.sentAt, fiveMinutesAgo),
      ))
      .orderBy(notificationLogs.sentAt);
  } else {
    const cleanPhone = sender.split('@')[0];
    recentLogs = await db
      .select()
      .from(notificationLogs)
      .where(and(
        isNull(notificationLogs.memberId),
        eq(notificationLogs.type, 'WHATSAPP_INCOMING'),
        ilike(notificationLogs.content, `[De: ${cleanPhone}]%`),
        gte(notificationLogs.sentAt, fiveMinutesAgo),
      ))
      .orderBy(notificationLogs.sentAt);
  }

  // Combina as mensagens recentes
  const combinedContent = recentLogs.length > 0
    ? recentLogs.map(log => log.content).join('\n')
    : content;

  console.warn(`[HANDLE_INCOMING_MSG] Context: ${combinedContent}`);

  // Se o membro existe
  if (member) {
    const currentStatus = member.status || 'ACTIVE';
    const memberFullName = `${member.firstName} ${member.lastName}`.trim();
    const cleanPhone = cleanPhoneDigits(sender);

    console.warn(`[HANDLE_INCOMING_MSG] Found member: ${memberFullName} (Status: ${currentStatus})`);

    const result = await analyzeMessageWithAI(content, memberFullName, combinedContent);
    console.warn(`[HANDLE_INCOMING_MSG] AI Intent analysis result:`, result);

    // 🛑 REGRA 1: Opt-Out Imediato (Se a pessoa disse "não", "não quero", "não envie", "parar")
    if (result.detectedOptIn === false) {
      let updatedFirstName = member.firstName;
      let updatedLastName = member.lastName;
      if (result.detectedName) {
        const parts = result.detectedName.trim().split(' ');
        updatedFirstName = parts[0] || member.firstName;
        updatedLastName = parts.slice(1).join(' ') || member.lastName;
      }

      await db
        .update(members)
        .set({
          firstName: updatedFirstName,
          lastName: updatedLastName,
          status: 'UPDATED',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Membro ${updatedFirstName} ${updatedLastName} optou por não receber mensagens (Opt-Out registrado)`,
      });

      const optOutMsg = `Compreendido perfeitamente! Respeitamos sua escolha e não enviaremos mais mensagens por aqui. Se precisar de algo no futuro, estaremos sempre à disposição. Tenha um excelente dia! 🙏`;

      await WhatsAppService.sendMessage({
        phone: sender,
        message: optOutMsg,
        organizationId,
      });

      return { status: 'handled_opt_out' };
    }

    // 🔄 REGRA 2: Membro em AWAITING_UPDATE (aguardando dados da nova pessoa ou resposta de opt-in)
    if (currentStatus === 'AWAITING_UPDATE') {
      // 2.1 Se confirmou Opt-In ("Sim", "Gostaria de receber", "Pode mandar", "Aceito")
      if (result.detectedOptIn === true || result.intent === 'CONFIRMED') {
        const displayName = `${member.firstName} ${member.lastName}`.trim();

        await db
          .update(members)
          .set({
            status: 'ACTIVE',
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));

        await logSystemActivity({
          organizationId,
          action: 'UPDATE',
          entityType: 'MEMBER',
          entityName: `Cadastro confirmado e ativado: ${displayName}`,
        });

        const welcomeMessage = [
          `🙌 *Cadastro Atualizado!* Obrigado por nos ajudar a manter seus dados corretos.`,
          ``,
          `Confirmamos os seguintes dados no sistema:`,
          `👤 *Nome:* ${displayName}`,
          `📧 *E-mail:* ${member.email || 'Não informado'}`,
          `📍 *Endereço:* ${member.address || 'Não informado'}`,
          ``,
          `Seja muito bem-vindo(a)! Que Deus abençoe sua vida! ✨`,
        ].join('\n');

        await WhatsAppService.sendMessage({
          phone: sender,
          message: welcomeMessage,
          organizationId,
        });

        return { status: 'awaiting_update_confirmed_opt_in' };
      }

      // 2.2 Se informou nome (ex: "Natalia Chaves", "Me chamo Carlos", etc.)
      if (result.detectedName) {
        const parts = result.detectedName.trim().split(' ');
        const visitorFirstName = parts[0] || member.firstName;
        const visitorLastName = parts.slice(1).join(' ') || '';

        await db
          .update(members)
          .set({
            firstName: visitorFirstName,
            lastName: visitorLastName,
            email: result.detectedEmail || null,
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
          entityName: `Nome atualizado para ${visitorFirstName} ${visitorLastName} (aguardando confirmação)`,
        });

        const displayName = `${visitorFirstName} ${visitorLastName}`.trim();
        const promptOptInMsg = `Pedimos sinceras desculpas pelo engano! 🙏 Já ajustamos seu nome no sistema.\n\nPrazer em conhecer você, *${displayName}*! 😊 Você gostaria de continuar recebendo nossas mensagens, novidades e convites da igreja por aqui?`;

        await WhatsAppService.sendMessage({
          phone: sender,
          message: promptOptInMsg,
          organizationId,
        });

        return { status: 'name_updated_awaiting_opt_in' };
      }
    }

    // ⚠️ REGRA 3: Mensagem de Número Errado Inicial (WRONG_NUMBER)
    if (result.intent === 'WRONG_NUMBER') {
      // Se já veio com o nome novo na mesma frase (ex: "Não me chamo Beatriz, sou o João")
      if (result.detectedName) {
        const parts = result.detectedName.trim().split(' ');
        const visitorFirstName = parts[0] || 'Visitante';
        const visitorLastName = parts.slice(1).join(' ') || '';

        await db
          .update(members)
          .set({
            firstName: visitorFirstName,
            lastName: visitorLastName,
            email: result.detectedEmail || null,
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
          entityName: `Nome do cadastro corrigido para ${visitorFirstName} ${visitorLastName} via mensagem inicial`,
        });

        const displayName = `${visitorFirstName} ${visitorLastName}`.trim();
        const askOptInMsg = `Pedimos sinceras desculpas pelo engano! 🙏 Já ajustamos seu nome no sistema.\n\nPrazer em conhecer você, *${displayName}*! 😊 Você gostaria de continuar recebendo nossas mensagens, novidades e convites da igreja por aqui?`;

        await WhatsAppService.sendMessage({
          phone: sender,
          message: askOptInMsg,
          organizationId,
        });

        return { status: 'handled_wrong_number_with_name' };
      }

      // Se apenas avisou que não é a pessoa procurada sem fornecer o novo nome
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
        entityName: `Cadastro de ${memberFullName} colocado em AWAITING_UPDATE para identificação da nova pessoa`,
      });

      const askNameMsg = `Pedimos sinceras desculpas pelo engano! 🙏 Já estamos atualizando seu cadastro.\n\nPoderia nos dizer qual é o seu nome? E você gostaria de continuar recebendo mensagens e convites da nossa igreja por aqui?`;

      await WhatsAppService.sendMessage({
        phone: sender,
        message: askNameMsg,
        organizationId,
      });

      return { status: 'handled_wrong_number_awaiting_name' };
    }

    // ✏️ REGRA 4: Dados Desatualizados / Atualização de Cadastro (OUTDATED_DATA ou correção de nome)
    const isNameDifferent = Boolean(
      result.detectedName
      && result.detectedName.trim().toLowerCase() !== member.firstName.trim().toLowerCase(),
    );

    const hasDetailsToUpdate = Boolean(
      result.detectedName
      || result.detectedEmail
      || result.detectedAddress,
    );

    if (result.intent === 'OUTDATED_DATA' || isNameDifferent) {
      if (!hasDetailsToUpdate) {
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

        await WhatsAppService.sendMessage({
          phone: sender,
          message: responseMsg,
          organizationId,
        });

        return { status: 'awaiting_update_prompt_sent' };
      }

      let updatedFirstName = member.firstName;
      let updatedLastName = member.lastName;

      if (result.detectedName) {
        const parts = result.detectedName.trim().split(' ');
        const newFirst = parts[0] || member.firstName;
        const newLast = parts.slice(1).join(' ');

        updatedFirstName = newFirst;
        if (newLast) {
          updatedLastName = newLast;
        } else if (newFirst.toLowerCase() !== member.firstName.toLowerCase()) {
          updatedLastName = '';
        } else {
          updatedLastName = (member.lastName.includes('(F') || member.lastName === 'Contato' ? '' : member.lastName);
        }
      }

      const emailToUpdate = result.detectedEmail !== undefined ? result.detectedEmail : member.email;
      const addressToUpdate = result.detectedAddress !== undefined ? result.detectedAddress : member.address;

      await db
        .update(members)
        .set({
          firstName: updatedFirstName,
          lastName: updatedLastName,
          email: emailToUpdate,
          address: addressToUpdate,
          phone: member.phone || cleanPhone,
          status: 'ACTIVE',
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));

      await logSystemActivity({
        organizationId,
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityName: `Cadastro atualizado: ${updatedFirstName} ${updatedLastName}`.trim(),
      });

      const displayName = `${updatedFirstName} ${updatedLastName}`.trim();
      const confirmationMessage = [
        `🙌 *Cadastro Atualizado!* Obrigado por nos ajudar a manter seus dados corretos.`,
        ``,
        `Confirmamos os seguintes dados no sistema:`,
        `👤 *Nome:* ${displayName}`,
        `📧 *E-mail:* ${emailToUpdate || 'Não informado'}`,
        `📍 *Endereço:* ${addressToUpdate || 'Não informado'}`,
        ``,
        `Seja muito bem-vindo(a)! Que Deus abençoe sua vida! ✨`,
      ].join('\n');

      await WhatsAppService.sendMessage({
        phone: sender,
        message: confirmationMessage,
        organizationId,
      });

      return { status: 'member_data_corrected' };
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
