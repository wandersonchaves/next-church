import * as React from 'react';

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'purple' | 'emerald' | 'blue' | 'amber' | 'indigo' | 'pink' | 'rose' | 'orange';
  active?: boolean;
  size?: 'default' | 'compact';
};

export const StatCard = ({ icon, label, value, color, active, size = 'default' }: StatCardProps) => {
  const themes = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`
      flex items-center gap-4 rounded-3xl border-2 transition-all duration-300
      ${size === 'default' ? 'p-6' : 'p-4'}
      ${active ? 'scale-[1.02] border-blue-500 bg-white shadow-xl' : 'border-transparent bg-white shadow-sm hover:shadow-md'}
    `}
    >
      <div className={`shrink-0 rounded-2xl ${themes[color]} ${size === 'default' ? 'p-4' : 'p-3'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
          {label}
        </p>
        <p className="mt-1 leading-none font-bold tracking-tighter text-slate-900" style={{ fontSize: size === 'default' ? '2.5rem' : '1.5rem' }}>
          {value}
        </p>
      </div>
    </div>
  );
};
