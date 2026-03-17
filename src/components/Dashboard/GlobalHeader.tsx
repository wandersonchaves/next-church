'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  History as HistoryIcon,
  Send,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';
import { Link, usePathname } from '@/libs/I18nNavigation';
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { AppConfig } from '@/utils/AppConfig';

export const GlobalHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Ministérios', href: '/dashboard/ministries', icon: Briefcase },
    { name: 'Equipe', href: '/dashboard/team', icon: Users },
    { name: 'Registros', href: '/dashboard/activity', icon: HistoryIcon },
    { name: 'Comunicação', href: '/dashboard/communication', icon: Send },
  ];

  const isActive = (href: string) => pathname.includes(href);

  return (
    <header className="sticky top-0 z-100 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* LOGO E ORGANIZAÇÃO */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200 transition-transform group-hover:scale-105">
              <span className="text-lg font-black italic">P</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-sm font-black tracking-tighter text-slate-900 uppercase italic leading-none">{AppConfig.name}</h1>
              <p className="mt-1 text-[8px] font-bold tracking-[0.3em] text-blue-600 uppercase">Vision Hub</p>
            </div>
          </Link>

          <div className="hidden h-8 w-px bg-slate-100 md:block" />

          <div className="hidden md:block">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger: "px-4 py-2 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest text-slate-600 border border-slate-100",
                }
              }}
            />
          </div>
        </div>

        {/* NAVEGAÇÃO DESKTOP */}
        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all
                  ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <Icon size={14} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* AÇÕES E PERFIL */}
        <div className="flex items-center gap-4">
          <button className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 md:flex transition-colors">
            <Search size={20} />
          </button>

          <div className="relative">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full border-2 border-white bg-blue-600" />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-100 mx-2" />

          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-10 w-10 rounded-xl shadow-md shadow-slate-200 border-2 border-white",
              }
            }}
          />

          {/* MOBILE MENU TOGGLE */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white md:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE NAV */}
      {isMenuOpen && (
        <div className="border-t border-slate-50 bg-white p-6 md:hidden animate-in slide-in-from-top duration-300">
          <div className="mb-6 block md:hidden">
            <OrganizationSwitcher hidePersonal />
          </div>
          <nav className="flex flex-col gap-2">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    flex items-center gap-4 rounded-2xl p-4 text-sm font-black tracking-widest uppercase transition-all
                    ${isActive(item.href) ? 'bg-blue-50 text-blue-600 shadow-sm' : 'bg-slate-50/50 text-slate-500'}
                  `}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
