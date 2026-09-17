'use client';

import { Clock, Heart, MessageSquare, PartyPopper, Search, Smile, Sparkles, Users, X } from 'lucide-react';
import * as React from 'react';
import { ALL_EMOJIS, EMOJI_CATEGORIES, searchEmojis } from '@/utils/EmojiData';

const RECENT_STORAGE_KEY = 'nextchurch_recent_emojis';
const MAX_RECENT_EMOJIS = 16;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  faith: <Sparkles size={14} />,
  emotions: <Smile size={14} />,
  people: <Users size={14} />,
  symbols: <Heart size={14} />,
  events: <PartyPopper size={14} />,
  communication: <MessageSquare size={14} />,
};

export const EmojiPicker = (props: {
  isOpen: boolean;
  onCloseAction: () => void;
  onSelectEmojiAction: (emoji: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>('faith');
  const [hoveredEmoji, setHoveredEmoji] = React.useState<{ emoji: string; name: string } | null>(null);
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Load recent emojis on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.slice(0, MAX_RECENT_EMOJIS));
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Focus search input when picker opens
  React.useEffect(() => {
    if (props.isOpen) {
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
    setSearchQuery('');
    setHoveredEmoji(null);
    return undefined;
  }, [props.isOpen]);

  // Click outside and Escape key listener to close picker
  React.useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        props.onCloseAction();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onCloseAction();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [props.isOpen, props.onCloseAction]);

  if (!props.isOpen) {
    return null;
  }

  const handleSelect = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT_EMOJIS);
    setRecentEmojis(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage write errors
      }
    }

    props.onSelectEmojiAction(emoji);
  };

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching ? searchEmojis(searchQuery) : [];

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeCategoryId);

  let activeEmojis = currentCategory?.emojis || [];
  if (isSearching) {
    activeEmojis = searchResults;
  } else if (activeCategoryId === 'recent') {
    activeEmojis = recentEmojis.map((emoji) => {
      const found = ALL_EMOJIS.find(e => e.emoji === emoji);
      return found || { emoji, name: 'Recente', keywords: [] };
    });
  }

  let footerText = 'Selecione um emoji';
  if (isSearching) {
    footerText = `${searchResults.length} encontrados`;
  } else if (currentCategory?.label) {
    footerText = currentCategory.label;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 z-50 mb-3 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all sm:w-96"
    >
      {/* HEADER: Search and Close */}
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar emoji (ex: oração, bíblia, fogo)..."
              className="w-full rounded-2xl border-none bg-slate-100 py-2 pr-8 pl-8 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={props.onCloseAction}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Fechar seletor"
          >
            <X size={16} />
          </button>
        </div>

        {/* CATEGORY TABS (Only shown when not searching) */}
        {!isSearching && (
          <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5">
            {recentEmojis.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryId('recent')}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all ${
                  activeCategoryId === 'recent'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Clock size={12} />
                <span>Recentes</span>
              </button>
            )}

            {EMOJI_CATEGORIES.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all ${
                  activeCategoryId === category.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {CATEGORY_ICONS[category.id] || <span>{category.icon}</span>}
                <span>{category.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* EMOJI GRID */}
      <div className="h-64 overflow-y-auto p-3">
        {activeEmojis.length === 0
          ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
                <Smile size={32} className="mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">Nenhum emoji encontrado</p>
                <p className="text-[10px] text-slate-400">Tente buscar por outras palavras em português ou inglês.</p>
              </div>
            )
          : (
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                {activeEmojis.map(item => (
                  <button
                    key={`${item.emoji}-${item.name}`}
                    type="button"
                    onClick={() => handleSelect(item.emoji)}
                    onMouseEnter={() => setHoveredEmoji({ emoji: item.emoji, name: item.name })}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all hover:scale-125 hover:bg-indigo-50 active:scale-95"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
      </div>

      {/* FOOTER: Preview & Info */}
      <div className="flex h-9 items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-1.5 text-[11px] text-slate-500">
        {hoveredEmoji
          ? (
              <div className="flex items-center gap-2 truncate">
                <span className="text-base leading-none">{hoveredEmoji.emoji}</span>
                <span className="truncate font-semibold text-slate-700">{hoveredEmoji.name}</span>
              </div>
            )
          : (
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {footerText}
              </span>
            )}
        <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">Esc para fechar</span>
      </div>
    </div>
  );
};
