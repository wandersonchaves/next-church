import { auth } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { MessageSquare, User, Clock, Phone, ChevronRight, Reply } from 'lucide-react';
import { NotificationService } from '@/libs/services/NotificationService';
import Link from 'next/link';
import { db } from '@/libs/DB';
import { notificationLogs } from '@/models/Schema';
import { inArray } from 'drizzle-orm';

export default async function InboxPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  const messages = await NotificationService.getIncomingMessages(orgId);
  
  // Busca mensagens originais (quotes) para dar contexto
  const parentIds = messages
    .map(m => (m as any).parentExternalId)
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    
  const parentMessages = parentIds.length > 0 
    ? await db.select().from(notificationLogs).where(inArray(notificationLogs.externalId, parentIds))
    : [];

  const getParentContent = (parentId: string) => {
    return parentMessages.find(pm => pm.externalId === parentId)?.content;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 rounded-4xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-xl leading-none font-black tracking-tight text-slate-900 uppercase">Mensagens Recebidas</h1>
              <p className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Respostas do WhatsApp</p>
            </div>
          </div>
          <Link
            href={`/${locale}/dashboard/communication`}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-[10px] font-black tracking-widest text-slate-600 uppercase transition-all hover:bg-slate-200"
          >
            Voltar ao Hub
          </Link>
        </header>

        {/* MESSAGES LIST */}
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className="group flex flex-col gap-4 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-lg transition-all hover:border-indigo-200 hover:shadow-xl sm:flex-row sm:items-center"
            >
              {/* MEMBER INFO */}
              <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <User size={20} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-black text-slate-800">
                    {msg.member ? `${msg.member.firstName} ${msg.member.lastName}` : 'Contato Desconhecido'}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Phone size={10} />
                    {msg.member?.phone || 'WhatsApp'}
                  </div>
                </div>
              </div>

              {/* MESSAGE CONTENT */}
              <div className="flex-1 space-y-2 overflow-hidden">
                {msg.parentExternalId && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50/50 px-3 py-1.5 text-[10px] font-bold text-slate-400 italic">
                    <Reply size={10} className="rotate-180" />
                    <span className="truncate">
                      Resposta a: {getParentContent(msg.parentExternalId) || `Mensagem [${msg.parentExternalId.slice(-6)}]`}
                    </span>
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 p-4 transition-colors group-hover:bg-indigo-50/50">
                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {msg.content}
                  </p>
                </div>
              </div>

              {/* METADATA */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 sm:w-32 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                  <Clock size={12} />
                  {new Date(msg.sentAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <span className="text-[10px] font-bold text-slate-300">
                  {new Date(msg.sentAt!).toLocaleDateString()}
                </span>
              </div>

              {/* ACTION */}
              <div className="hidden sm:block">
                <ChevronRight size={20} className="text-slate-200 transition-colors group-hover:text-indigo-300" />
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-200">
                <MessageSquare size={48} />
              </div>
              <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">Nenhuma mensagem ainda</h3>
              <p className="mt-2 text-xs font-medium text-slate-300 italic">As respostas dos membros aparecerão aqui automaticamente.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
