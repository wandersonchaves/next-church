'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function LineageSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado local para o valor do input para uma UI responsiva
  const [value, setValue] = useState(searchParams.get('search') || '');

  // Debounce manual para evitar muitas requisições
  useEffect(() => {
    // Se o valor for igual ao que já está na URL, não faz nada
    const currentSearch = searchParams.get('search') || '';
    if (value === currentSearch) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative w-full md:w-72">
      <Search
        className={`absolute top-1/2 left-4 -translate-y-1/2 transition-colors ${isPending ? 'animate-pulse text-indigo-500' : 'text-slate-400'}`}
        size={16}
      />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Pesquisar na linhagem..."
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-12 text-sm font-medium shadow-sm transition-all outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5"
      />
    </div>
  );
}
