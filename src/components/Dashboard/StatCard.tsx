import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: string;
  size?: 'default' | 'small';
}

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
  size = 'default'
}: StatCardProps) => {
  return (
    <div className={`
      bg-white rounded-4xl border border-slate-200 p-6 flex items-center gap-5
      shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all duration-300
    `}>
      <div className={`shrink-0 rounded-2xl ${themes[color]} ${size === 'default' ? 'p-4' : 'p-3'}`}>
        <Icon size={size === 'default' ? 24 : 20} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
          {trend && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>}
        </div>
      </div>
    </div>
  );
};
