import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: string;
  size?: 'default' | 'small';
};

const themes: Record<string, string> = {
  'bg-slate-900': 'bg-slate-900 text-white shadow-slate-200',
  'bg-blue-600': 'bg-blue-600 text-white shadow-blue-100',
  'bg-emerald-600': 'bg-emerald-600 text-white shadow-emerald-100',
  'bg-orange-500': 'bg-orange-500 text-white shadow-orange-100',
  'bg-indigo-600': 'bg-indigo-600 text-white shadow-indigo-100',
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'bg-blue-600',
  trend,
  size = 'default',
}: StatCardProps) => {
  return (
    <div className={`
      flex items-center gap-5 rounded-4xl border border-slate-200 bg-white p-6
      shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl
    `}
    >
      <div className={`shrink-0 rounded-2xl ${themes[color]} ${size === 'default' ? 'p-4' : 'p-3'}`}>
        <Icon size={size === 'default' ? 24 : 20} />
      </div>
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] leading-none font-black tracking-[0.2em] text-slate-400 uppercase">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl leading-none font-black text-slate-900">{value}</h3>
          {trend && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-500">{trend}</span>}
        </div>
      </div>
    </div>
  );
};
