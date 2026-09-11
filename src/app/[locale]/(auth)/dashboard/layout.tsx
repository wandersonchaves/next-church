import { setRequestLocale } from 'next-intl/server';
import { GlobalHeader } from '@/components/Dashboard/GlobalHeader';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* HEADER UNIFICADO (SSOT) */}
      <GlobalHeader />

      {/* ÁREA DE CONTEÚDO */}
      <main>
        {props.children}
      </main>

      {/* FOOTER DISCRETO */}
      <footer className="mt-20 border-t border-slate-100 bg-white py-10 text-center print:hidden">
        <p className="text-[10px] font-black tracking-[0.3em] text-slate-300 uppercase">
          NextChurch • G12 Vision Management
        </p>
      </footer>
    </div>
  );
}
