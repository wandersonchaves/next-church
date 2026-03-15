import { AlertCircle, Info, Lightbulb, ShieldCheck } from 'lucide-react';

type AlertProps = {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  message: string;
  className?: string;
};

export const Alert = ({ type, title, message, className = '' }: AlertProps) => {
  const styles = {
    info: {
      container: 'bg-blue-50 border-blue-100 text-blue-800',
      icon: <Info size={18} className="text-blue-600" />,
    },
    warning: {
      container: 'bg-amber-50 border-amber-100 text-amber-800',
      icon: <AlertCircle size={18} className="text-amber-600" />,
    },
    success: {
      container: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      icon: <ShieldCheck size={18} className="text-emerald-600" />,
    },
    tip: {
      container: 'bg-indigo-50 border-indigo-100 text-indigo-800',
      icon: <Lightbulb size={18} className="text-indigo-600" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div className={`flex gap-4 rounded-2xl border-2 p-5 transition-all ${currentStyle.container} ${className}`}>
      <div className="mt-0.5 shrink-0">
        {currentStyle.icon}
      </div>
      <div>
        <p className="mb-1 text-[10px] font-black tracking-[0.2em] uppercase opacity-80">{title}</p>
        <p className="text-sm leading-relaxed font-medium">{message}</p>
      </div>
    </div>
  );
};
