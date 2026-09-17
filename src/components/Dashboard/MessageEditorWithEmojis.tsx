'use client';

import { Smile, Sparkles, Trash2, User } from 'lucide-react';
import * as React from 'react';
import { EmojiPicker } from '@/components/Dashboard/EmojiPicker';
import { QUICK_EMOJIS } from '@/utils/EmojiData';

export const MessageEditorWithEmojis = (props: {
  value: string;
  onChangeAction: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  id?: string;
  showNameVariable?: boolean;
  className?: string;
}) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInsertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      props.onChangeAction(props.value + text);
      return;
    }

    const start = textarea.selectionStart ?? props.value.length;
    const end = textarea.selectionEnd ?? props.value.length;
    const updatedValue = props.value.slice(0, start) + text + props.value.slice(end);

    props.onChangeAction(updatedValue);

    // Re-focus and update cursor position right after the inserted text
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        const nextCursorPos = start + text.length;
        textarea.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    });
  };

  const handleSelectEmoji = (emoji: string) => {
    handleInsertText(emoji);
  };

  return (
    <div className={`relative flex flex-col ${props.className || ''}`}>
      {/* TOOLBAR */}
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        {/* LEFT: Emoji Trigger & Quick Emojis */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Main Emoji Picker Toggle Button */}
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            disabled={props.disabled}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black tracking-wider uppercase transition-all ${
              isEmojiPickerOpen
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95'
            } disabled:opacity-50`}
            title="Abrir catálogo completo de emojis"
          >
            <Smile size={14} className={isEmojiPickerOpen ? 'animate-bounce' : ''} />
            <span>Emojis</span>
          </button>

          <span className="h-4 w-px bg-slate-200" />

          {/* Quick Emojis Bar */}
          <div className="flex items-center gap-0.5 overflow-x-auto py-0.5">
            {QUICK_EMOJIS.slice(0, 10).map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertText(emoji)}
                disabled={props.disabled}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-transform hover:scale-125 hover:bg-slate-100 active:scale-90 disabled:opacity-50"
                title={`Inserir ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Dynamic variables & Clear */}
        <div className="flex items-center gap-2">
          {props.showNameVariable !== false && (
            <button
              type="button"
              onClick={() => handleInsertText('{name}')}
              disabled={props.disabled}
              className="flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-blue-700 uppercase transition-all hover:bg-blue-100 active:scale-95 disabled:opacity-50"
              title="Inserir variável do primeiro nome do membro"
            >
              <User size={12} />
              <span>&#123;name&#125;</span>
            </button>
          )}

          {props.value.length > 0 && (
            <button
              type="button"
              onClick={() => props.onChangeAction('')}
              disabled={props.disabled}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              title="Limpar mensagem"
            >
              <Trash2 size={13} />
            </button>
          )}

          <span className="text-[10px] font-bold text-slate-400">
            {props.value.length}
            {' '}
            caracteres
          </span>
        </div>

        {/* EMOJI PICKER POPOVER */}
        <EmojiPicker
          isOpen={isEmojiPickerOpen}
          onCloseAction={() => setIsEmojiPickerOpen(false)}
          onSelectEmojiAction={handleSelectEmoji}
        />
      </div>

      {/* TEXTAREA */}
      <textarea
        ref={textareaRef}
        id={props.id}
        value={props.value}
        onChange={e => props.onChangeAction(e.target.value)}
        placeholder={props.placeholder || 'Digite sua mensagem...'}
        rows={props.rows || 10}
        disabled={props.disabled}
        className="h-80 w-full resize-none rounded-4xl border-none bg-slate-50 p-6 text-lg font-medium text-slate-700 transition-all outline-none focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-50"
      />

      {/* FOOTER TIP */}
      <div className="mt-2 flex items-center justify-between px-2 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles size={11} className="text-amber-500" />
          Dica: Use os atalhos de emojis acima ou abra a busca rápida para personalizar a mensagem.
        </span>
      </div>
    </div>
  );
};
