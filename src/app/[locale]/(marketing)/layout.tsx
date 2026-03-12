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
        <>
          <li>
            <Link href="/" className="border-none text-gray-700 hover:text-gray-900">
              {t('home_link')}
            </Link>
          </li>
          <li>
            <Link href="/about/" className="border-none text-gray-700 hover:text-gray-900">
              {t('about_link')}
            </Link>
          </li>
          <li>
            <Link href="/portfolio/" className="border-none text-gray-700 hover:text-gray-900">
              {t('portfolio_link')}
            </Link>
          </li>
          {/* Link dinâmico para Dashboard apenas se logado */}
          <SignedIn>
            <li>
              <Link href="/dashboard/" className="border-none font-bold text-blue-600 hover:text-blue-800">
                Dashboard
              </Link>
            </li>
          </SignedIn>
        </>
      )}
      rightNav={(
        <div className="flex items-center gap-x-5">
          {/* Se NÃO logado: mostra Sign in / Sign up */}
          <SignedOut>
            <li>
              <Link href="/sign-in/" className="border-none text-gray-700 hover:text-gray-900">
                {t('sign_in_link')}
              </Link>
            </li>
            <li>
              <Link href="/sign-up/" className="border-none text-gray-700 hover:text-gray-900">
                {t('sign_up_link')}
              </Link>
            </li>
          </SignedOut>

          {/* Se logado: mostra o Botão de Perfil do Usuário */}
          <SignedIn>
            <li>
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
            </li>
          </SignedIn>

          <li>
            <LocaleSwitcher />
          </li>
        </div>
      )}
    >
      <div className="py-5 text-xl [&_p]:my-6">{props.children}</div>
    </BaseTemplate>
  );
}
