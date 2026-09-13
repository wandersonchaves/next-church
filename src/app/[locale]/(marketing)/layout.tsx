import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Link } from '@/libs/I18nNavigation';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'RootLayout',
  });

  return (
    <BaseTemplate
      leftNav={(
        <div className="flex items-center gap-x-10">
          <li>
            <Link href="/" className="text-sm font-bold tracking-widest text-slate-600 uppercase transition-colors hover:text-blue-600">
              {t('home_link')}
            </Link>
          </li>
          <li>
            <Link href="/about/" className="text-sm font-bold tracking-widest text-slate-600 uppercase transition-colors hover:text-blue-600">
              {t('about_link')}
            </Link>
          </li>
          <li>
            <Link href="/portfolio/" className="text-sm font-bold tracking-widest text-slate-600 uppercase transition-colors hover:text-blue-600">
              {t('portfolio_link')}
            </Link>
          </li>
          <SignedIn>
            <li>
              <Link href="/dashboard/" className="text-sm font-black tracking-widest text-blue-600 uppercase transition-colors hover:text-blue-800">
                Painel
              </Link>
            </li>
          </SignedIn>
        </div>
      )}
      rightNav={(
        <div className="flex items-center gap-x-8">
          <SignedOut>
            <li>
              <Link href="/sign-in/" className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-900">
                {t('sign_in_link')}
              </Link>
            </li>
            <li>
              <Link
                href="/sign-up/"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
              >
                {t('sign_up_link')}
              </Link>
            </li>
          </SignedOut>

          <SignedIn>
            <li>
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 shadow-md' } }} />
            </li>
          </SignedIn>

          <li className="border-l border-slate-100 pl-6">
            <LocaleSwitcher />
          </li>
        </div>
      )}
    >
      <div className="py-10">{props.children}</div>
    </BaseTemplate>
  );
}
