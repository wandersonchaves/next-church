import { auth } from '@clerk/nextjs/server';
import { db } from '@/libs/DB';
import { auditLogs } from '@/models/Schema';
import { eq, desc } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { History, User, Activity, Clock, Tag } from 'lucide-react';

export default async function ActivityPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) return null;

  // Busca os últimos 50 logs da organização
  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, orgId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  const actionColors: Record<string, string> = {
    CREATE: 'text-emerald-600 bg-emerald-50',
    UPDATE: 'text-blue-600 bg-blue-50',
    DELETE: 'text-red-600 bg-red-50',
    PROMOTE: 'text-amber-600 bg-amber-50',
    EXPORT: 'text-indigo-600 bg-indigo-50',
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-[#F8FAFC] min-h-screen font-sans">
      <header className="flex items-center gap-4">
        <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
          <History size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Registro de Atividades</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Auditoria e Transparência</p>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Entidade</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <User size={14} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{log.entityName || 'N/A'}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{log.entityType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-600 text-xs">{new Date(log.createdAt).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Activity size={40} className="text-slate-100" />
                      <p className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Nenhuma atividade registrada ainda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
