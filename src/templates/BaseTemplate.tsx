import { useTranslations } from 'next-intl';
import { AppConfig } from '@/utils/AppConfig';

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const t = useTranslations('BaseTemplate');

  return (
    <div className="w-full min-h-screen bg-white text-slate-700 antialiased font-sans">
      {/* Container principal ampliado para Enterprise SaaS */}
      <div className="mx-auto max-w-7xl">
        <header className="px-6 py-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                {AppConfig.name}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
                {t('description')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-8 gap-y-4">
              <nav aria-label={t('main_navigation_label')}>
                <ul className="flex items-center gap-x-8 text-sm font-black uppercase tracking-widest">
                  {props.leftNav}
                </ul>
              </nav>

              <nav>
                <ul className="flex items-center gap-x-6">
                  {props.rightNav}
                </ul>
              </nav>
            </div>
          </div>
        </header>

        <main className="min-h-[60vh]">
          {props.children}
        </main>

        <footer className="py-12 border-t border-slate-50 px-6 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
            © {new Date().getFullYear()} {AppConfig.name} • G12 Visionary Platform
          </p>
        </footer>
      </div>
    </div>
  );
};
