import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { Activity, History, User } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { db } from '@/libs/DB';
import { auditLogs } from '@/models/Schema';

export default async function ActivityPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

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
    <div className="min-h-screen space-y-10 bg-[#F8FAFC] p-4 font-sans lg:p-10">
      <header className="flex items-center gap-4">
        <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-xl">
          <History size={28} />
        </div>
        <div>
          <h1 className="text-3xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">Registro de Atividades</h1>
          <p className="mt-2 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Auditoria e Transparência</p>
        </div>
      </header>

      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Ação</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Entidade</th>
                <th className="px-8 py-5 text-right text-[10px] font-black tracking-widest text-slate-400 uppercase">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => (
                <tr key={log.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all group-hover:bg-slate-900 group-hover:text-white">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{log.entityName || 'N/A'}</span>
                      <span className="mt-0.5 text-[9px] font-bold tracking-tighter text-slate-400 uppercase">{log.entityType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-600">{new Date(log.createdAt).toLocaleDateString()}</span>
                      <span className="text-[10px] font-medium text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Activity size={40} className="text-slate-100" />
                      <p className="text-sm font-bold tracking-widest text-slate-300 uppercase italic">Nenhuma atividade registrada ainda</p>
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
