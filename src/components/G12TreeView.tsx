'use client';

import type { G12Node } from '@/libs/services/MemberService';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Maximize2,
  Shield,
  User,
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

// Helper para coletar IDs iniciais (Fatorado para fora para ser usado no Lazy Init)
const getInitialExpandedIds = (nodes: G12Node[], limit: number): Set<string> => {
  const ids = new Set<string>();
  const collect = (list: G12Node[], l: number) => {
    if (l <= 0) {
      return;
    }
    list.forEach((n) => {
      ids.add(n.id);
      if (n.children) {
        collect(n.children, l - 1);
      }
    });
  };
  collect(nodes, limit);
  return ids;
};

const G12TreeRow = ({ node, depth, isOpen, onToggle, onPromote, loading }: {
  node: G12Node;
  depth: number;
  isOpen: boolean;
  onToggle: () => void;
  onPromote: (node: G12Node) => void;
  loading: boolean;
}) => {
  const hasChildren = node.children.length > 0;
  const currentIdx = stepsOrder.indexOf(node.currentStep);
  const nextStep = currentIdx < stepsOrder.length - 1 ? stepsOrder[currentIdx + 1] : null;

  const getLabel = () => {
    if (node.level === 1) {
      return { text: 'PASTOR', color: 'border-amber-500 text-amber-600', icon: <Crown size={16} /> };
    }
    if (!node.generationSlot) {
      return { text: 'PENDENTE', color: 'border-slate-300 text-slate-400', icon: <User size={16} /> };
    }
    return { text: `F${node.generationSlot}`, color: 'border-blue-500 text-blue-600', icon: <Shield size={16} /> };
  };

  const label = getLabel();

  return (
    <div
      className={`
        group flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200
        ${isOpen ? 'border-blue-100 bg-white shadow-md' : 'border-slate-100 bg-white/40 hover:border-slate-200'}
        mb-2
      `}
      style={{ marginLeft: `${Math.min(depth * 16, 64)}px` }}
    >
      <div className={`shrink-0 rounded-xl p-2 ${isOpen ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
        {label.icon}
      </div>

      <div
        className="min-w-0 flex-1 cursor-pointer outline-none"
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm leading-none font-bold ${!node.generationSlot ? 'text-slate-400' : 'text-slate-800'}`}>
            {node.firstName}
            {' '}
            {node.lastName}
          </p>
          <span className={`rounded border px-1 text-[8px] font-black tracking-tighter uppercase ${label.color}`}>
            {label.text}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase ${stepColors[node.currentStep]}`}>
            {node.currentStep.replace(/_/g, ' ')}
          </span>
          {hasChildren && (
            <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {node.children.length}
              {' '}
              disc.
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {nextStep && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPromote(node);
            }}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-blue-50 hover:text-blue-600"
          >
            {loading ? <ArrowUpCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          </button>
        )}
        <button className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-900">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const G12TreeView = ({ data }: { data: G12Node[] }) => {
  // Inicialização Preguiçosa (Lazy Initial State) para evitar re-execução do useEffect
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => getInitialExpandedIds(data, 2));
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const flattenedData = React.useMemo(() => {
    const flattened: { node: G12Node; depth: number }[] = [];
    const recurse = (nodes: G12Node[], depth: number) => {
      nodes.forEach((node) => {
        flattened.push({ node, depth });
        if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
          recurse(node.children, depth + 1);
        }
      });
    };
    recurse(data, 0);
    return flattened;
  }, [data, expandedIds]);

  const rowVirtualizer = useVirtualizer({
    count: flattenedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePromote = async (node: G12Node) => {
    const steps = ['DECISION', 'CELL', 'UNIVERSITY_OF_LIFE', 'ENCOUNTER', 'LEADERSHIP_TRAINING', 'RE_ENCOUNTER', 'SENDING'];
    const currentIdx = steps.indexOf(node.currentStep);
    const nextStep = steps[currentIdx + 1];
    if (!nextStep) {
      return;
    }
    setLoadingId(node.id);
    await completeJourneyStepAction({ memberId: node.id, step: nextStep });
    setLoadingId(null);
  };

  return (
    <div
      ref={parentRef}
      className="custom-scrollbar relative h-150 overflow-y-auto lg:h-200"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = flattenedData[virtualRow.index];
          if (!item) {
            return null;
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <G12TreeRow
                node={item.node}
                depth={item.depth}
                isOpen={expandedIds.has(item.node.id)}
                onToggle={() => toggleNode(item.node.id)}
                onPromote={handlePromote}
                loading={loadingId === item.node.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
