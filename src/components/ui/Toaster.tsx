'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useToasts } from '@/lib/client/store';
import { IconCheck, IconClose } from '@/components/brand/Icons';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4" style={{ top: 'calc(var(--safe-top) + var(--content-top) + 0.75rem)' }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={() => dismiss(t.id)}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface-2/95 px-4 py-3 shadow-card backdrop-blur"
            style={{ borderColor: t.kind === 'error' ? '#ff456055' : t.kind === 'success' ? '#c6f43255' : '#ffffff22' }}
          >
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${t.kind === 'error' ? 'bg-rarity-mythic/20 text-rarity-mythic' : 'bg-lime-400/20 text-lime-300'}`}>
              {t.kind === 'error' ? <IconClose size={12} /> : <IconCheck size={12} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{t.title}</span>
              {t.text && <span className="mt-0.5 block text-[13px] leading-snug text-white/60">{t.text}</span>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
