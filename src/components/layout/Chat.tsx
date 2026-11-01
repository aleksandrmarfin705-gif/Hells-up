'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/ui';
import { IconSend } from '@/components/brand/Icons';
import { timeAgo } from '@/lib/format';

export type ChatMessage = { id: string; sender: 'user' | 'admin'; body: string; created_at: string };

/** Общий компонент переписки: `mine` — чьи сообщения показывать справа. */
export function Chat({ messages, mine, onSend, sending, disabled, placeholder }: {
  messages: ChatMessage[]; mine: 'user' | 'admin'; onSend: (text: string) => void; sending?: boolean; disabled?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length]);
  const send = () => { const t = text.trim(); if (!t || sending) return; onSend(t); setText(''); };
  return (
    <div className="flex flex-col gap-3">
      <div className="panel max-h-[55dvh] min-h-[240px] space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.sender === mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug', m.sender === mine ? 'rounded-br-md bg-[linear-gradient(135deg,#e4fb8c,#c6f432_60%,#8fbf1a)] text-[#0d1403]' : 'rounded-bl-md border border-white/10 bg-surface-3 text-white')}>
              {m.sender !== mine && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-lime-300">{m.sender === 'admin' ? 'Поддержка' : 'Пользователь'}</p>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={cn('mt-1 text-[10px]', m.sender === mine ? 'text-black/50' : 'text-white/35')}>{timeAgo(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {!disabled && (
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={1} placeholder={placeholder ?? 'Сообщение…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); send(); } }}
            className="input max-h-32 min-h-[48px] resize-none" />
          <Button onClick={send} loading={sending} disabled={!text.trim()} aria-label="Отправить" className="h-12 w-12 flex-none !px-0"><IconSend size={20} /></Button>
        </div>
      )}
    </div>
  );
}
