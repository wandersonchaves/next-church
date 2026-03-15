'use client';

import type { G12Node } from '@/libs/services/MemberService';
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  Crown,
  Maximize2,
  Shield,
} from 'lucide-react';
import * as React from 'react';
import { completeJourneyStepAction } from '@/app/[locale]/(auth)/dashboard/members/actions';

const stepColors: Record<string, string> = {
  DECISION: 'bg-slate-100 text-slate-600',
  CELL: 'bg-blue-100 text-blue-700',
  UNIVERSITY_OF_LIFE: 'bg-purple-100 text-purple-700',
  ENCOUNTER: 'bg-indigo-100 text-indigo-700',
  LEADERSHIP_TRAINING: 'bg-amber-100 text-amber-700',
  RE_ENCOUNTER: 'bg-teal-100 text-teal-700',
  SENDING: 'bg-emerald-100 text-emerald-700',
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
    if ('error' in result) {
      setError('!');
    }
    setLoading(false);
  }

  const labelText = node.level === 1 ? 'PASTOR' : `F${node.generationSlot || '?'}`;
  const Icon = node.level === 1 ? Crown : Shield;

  return (
    <div className="relative">
      <div
        className={`
          group flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200
          ${isOpen ? 'border-blue-100 bg-white shadow-lg' : 'border-slate-100 bg-white/50 hover:border-slate-200'}
          mb-2
        `}
      >
        {/* Identificador de Linhagem G12 */}
        <div className={`shrink-0 rounded-xl p-2 ${isOpen ? 'bg-slate-900 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400'}`}>
          <Icon size={18} />
        </div>

        {/* Informações Principais */}
        <div
          className="min-w-0 flex-1 cursor-pointer outline-none"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-2">
            <p className="truncate text-sm leading-none font-bold text-slate-800">
              {node.firstName}
              {' '}
              {node.lastName}
            </p>
            <span className="text-[9px] font-black tracking-tighter text-slate-300 uppercase">
              {labelText}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[8px] font-black tracking-widest uppercase ${stepColors[node.currentStep]}`}>
              {node.currentStep.replace(/_/g, ' ')}
            </span>
            {hasChildren && (
              <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
                <ChevronDown size={10} className={isOpen ? '' : '-rotate-90'} />
                {' '}
                {node.children.length}
                {' '}
                disc.
              </span>
            )}
          </div>
        </div>

        {/* Ações Rápidas (Apenas no Hover) */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {nextStep && (
            <button
              onClick={handlePromote}
              disabled={loading}
              className="rounded-lg p-2 text-slate-300 transition-all hover:bg-blue-50 hover:text-blue-600"
              title={`Promover para ${nextStep}`}
            >
              {loading ? <ArrowUpCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            </button>
          )}
          <button className="rounded-lg p-2 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-900">
            <Maximize2 size={16} />
          </button>
        </div>

        {error && <AlertCircle size={14} className="animate-pulse text-red-500" />}
      </div>

      {/* Sub-ninhos Recursivos com Indentação Progressiva de Bloco */}
      {
        hasChildren && isOpen && (
          <div className="ml-6 space-y-1 border-l-2 border-slate-100 pl-4 transition-all">
            {node.children.map(child => (
              <G12TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )
      }
    </div>
  );
};
