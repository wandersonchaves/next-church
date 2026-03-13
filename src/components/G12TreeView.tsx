'use client';

import type { G12Node } from '@/libs/services/MemberService';
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Maximize2,
  Shield,
} from 'lucide-react';
import * as React from 'react';
import { completeJourneyStepAction } from '@/app/[locale]/(auth)/dashboard/members/actions';

const stepColors: Record<string, string> = {
  DECISION: 'bg-slate-100 text-slate-700 border-slate-200',
  CELL: 'bg-blue-50 text-blue-700 border-blue-100',
  UNIVERSITY_OF_LIFE: 'bg-purple-50 text-purple-700 border-purple-100',
  ENCOUNTER: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  LEADERSHIP_TRAINING: 'bg-amber-50 text-amber-700 border-amber-100',
  RE_ENCOUNTER: 'bg-teal-50 text-teal-700 border-teal-100',
  SENDING: 'bg-green-50 text-green-700 border-green-100',
};

const stepsOrder = ['DECISION', 'CELL', 'UNIVERSITY_OF_LIFE', 'ENCOUNTER', 'LEADERSHIP_TRAINING', 'RE_ENCOUNTER', 'SENDING'];

export const G12TreeNode = (props: { node: G12Node; depth?: number }) => {
  const { node, depth = 0 } = props;
  const [isOpen, setIsOpen] = React.useState(depth < 1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasChildren = node.children.length > 0;
  const currentIdx = stepsOrder.indexOf(node.currentStep);
  const nextStep = currentIdx < stepsOrder.length - 1 ? stepsOrder[currentIdx + 1] : null;

  async function handlePromote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!nextStep) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await completeJourneyStepAction({ memberId: node.id, step: nextStep });

    // Type narrowing para satisfazer o TypeScript
    if ('error' in result && result.error) {
      setError('!');
    } else if ('success' in result && result.success) {
      setError(null);
    }

    setLoading(false);
  }

  const toggleOpen = () => setIsOpen(!isOpen);

  // Handler de teclado para acessibilidade
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOpen();
    }
  };

  const labelText = node.level === 1 ? 'PASTOR' : `GERAÇÃO F${node.generationSlot || '?'}`;
  const Icon = node.level === 1 ? Crown : Shield;

  return (
    <div className="group/node relative">
      <div
        className={`
          relative mb-2 flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300
          ${!node.generationSlot ? 'border-dashed bg-slate-50/50' : 'bg-white'}
          ${isOpen ? 'shadow-xl ring-1 ring-black/5' : 'border-slate-200 shadow-sm hover:border-blue-200'}
        `}
      >
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl ${node.level === 1 ? 'bg-amber-500' : node.generationSlot ? 'bg-blue-500 opacity-50' : 'bg-slate-300 opacity-30'}`} />

        <div className={`absolute -top-2.5 left-6 z-10 rounded-full border bg-white px-2 py-0.5 text-[9px] leading-none font-black tracking-widest uppercase shadow-sm ${node.level === 1 ? 'border-amber-500 text-amber-600' : 'border-slate-200 text-slate-500'}`}>
          {labelText}
        </div>

        <button
          onClick={toggleOpen}
          aria-expanded={isOpen}
          className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${hasChildren ? 'bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white' : 'invisible'}`}
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="relative shrink-0">
          <div className={`rounded-2xl p-2.5 ${isOpen ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>
            <Icon size={20} />
          </div>
          {hasChildren && (
            <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white shadow-lg ring-4 ring-white">
              {node.children.length}
            </span>
          )}
        </div>

        {/* Adicionando acessibilidade total ao container do nome */}
        <div
          className="min-w-0 flex-1 cursor-pointer rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          onClick={toggleOpen}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Membro: ${node.firstName} ${node.lastName}. Clique para expandir linhagem.`}
        >
          <p className={`truncate text-lg font-black tracking-tight ${!node.generationSlot ? 'text-slate-400' : 'text-slate-900'}`}>
            {node.firstName}
            {' '}
            {node.lastName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black tracking-widest uppercase shadow-sm ${stepColors[node.currentStep]}`}>
              {node.currentStep.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/node:opacity-100">
          {nextStep && (
            <button
              onClick={handlePromote}
              disabled={loading}
              className="rounded-2xl p-2.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
              aria-label={`Promover para ${nextStep.replace(/_/g, ' ')}`}
            >
              {loading ? <ArrowUpCircle size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
            </button>
          )}
          <button className="rounded-2xl p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900" aria-label="Ver Detalhes">
            <Maximize2 size={20} />
          </button>
        </div>
        {error && <AlertCircle size={18} className="ml-2 animate-pulse text-red-500" />}
      </div>

      {hasChildren && isOpen && (
        <div className="mt-2 ml-10 space-y-2 border-l-2 border-slate-100 pb-2 pl-4 transition-all duration-300 ease-in-out md:ml-14">
          {node.children.map(child => (
            <G12TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
