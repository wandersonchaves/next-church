import { useTranslations } from 'next-intl';
import { AppConfig } from '@/utils/AppConfig';

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const t = useTranslations('BaseTemplate');

  return (
    <div className="min-h-screen w-full bg-white font-sans text-slate-700 antialiased">
      {/* Container principal ampliado para Enterprise SaaS */}
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-50 px-6 py-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="flex flex-col">
              <h1 className="text-2xl leading-none font-black tracking-tighter text-slate-900 uppercase italic">
                {AppConfig.name}
              </h1>
              <p className="mt-2 text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">
                {t('description')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 md:justify-end">
              <nav aria-label={t('main_navigation_label')}>
                <ul className="flex items-center gap-x-8 text-sm font-black tracking-widest uppercase">
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

        <footer className="border-t border-slate-50 px-6 py-12 text-center">
          <p className="text-[10px] font-black tracking-[0.5em] text-slate-400 uppercase">
            ©
            {' '}
            {new Date().getFullYear()}
            {' '}
            {AppConfig.name}
            {' '}
            • G12 Visionary Platform
          </p>
        </footer>
      </div>
    </div>
  );
};
