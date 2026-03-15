'use client';

import { OrganizationSwitcher, SignOutButton, UserButton } from '@clerk/nextjs';
import { Globe, LayoutDashboard, LogOut, Menu, Send, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Link } from '@/libs/I18nNavigation';

export const GlobalHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Comunicação', href: '/dashboard/communication', icon: Send },
  ];

  const isActive = (href: string) => pathname.includes(href);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white shadow-sm">
      <div className="mx-auto max-w-400 px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">

          {/* LEFT: Branding */}
          <div className="flex items-center gap-4 lg:gap-8">
            <Link href="/dashboard" className="group flex items-center gap-2 lg:gap-3">
              <div className="rounded-lg bg-blue-600 p-1.5 shadow-lg shadow-blue-100 transition-transform group-hover:rotate-3 lg:rounded-xl lg:p-2">
                <LayoutDashboard className="h-4 w-4 text-white lg:h-5 lg:w-5" />
              </div>
              <span className="text-lg leading-none font-black tracking-tighter text-slate-900 uppercase italic lg:text-xl">
                Phila
                <span className="font-light text-blue-600 italic">Hub</span>
              </span>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black tracking-widest uppercase transition-all
                    ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <item.icon size={14} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* RIGHT: Tenant & Actions */}
          <div className="flex items-center gap-2 lg:gap-6">
            <div className="hidden sm:block">
              <OrganizationSwitcher
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: 'py-1.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 text-xs lg:text-sm',
                  },
                }}
              />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-100 pl-2 lg:gap-3 lg:pl-4">
              <div className="hidden md:block">
                <LocaleSwitcher />
              </div>
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 lg:w-9 lg:h-9' } }} />

              {/* MOBILE MENU TOGGLE */}
              <button
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-50 md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV (Drawer Style) */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full border-b border-slate-100 bg-white shadow-2xl duration-200 md:hidden">
          <nav className="space-y-2 p-4">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  flex items-center gap-4 rounded-2xl p-4 text-sm font-black tracking-widest uppercase transition-all
                  ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50/50 text-slate-500'}
                `}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}

            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-50 pt-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3 text-xs font-black tracking-widest text-slate-500 uppercase">
                  <Globe size={18} />
                  {' '}
                  Idioma
                </div>
                <LocaleSwitcher />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 sm:hidden">
                <OrganizationSwitcher />
              </div>

              <SignOutButton>
                <button className="flex w-full items-center gap-4 rounded-2xl bg-red-50 p-4 text-sm font-black tracking-widest text-red-500 uppercase transition-all active:scale-95">
                  <LogOut size={20} />
                  {' '}
                  Sair do Sistema
                </button>
              </SignOutButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
