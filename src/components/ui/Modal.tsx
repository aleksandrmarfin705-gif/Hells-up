'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { IconClose } from '@/components/brand/Icons';
import { cn } from '@/lib/cn';

/** Нижняя шторка на мобильных, центрированное окно на desktop. */
export function Modal({
  open, onOpenChange, title, description, children, className, dismissible = true,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title?: string; description?: string;
  children: ReactNode; className?: string; dismissible?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => (dismissible || v) && onOpenChange(v)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={description ? undefined : undefined}
              onPointerDownOutside={(e) => !dismissible && e.preventDefault()} onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}>
              <motion.div
                className={cn('fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-gold-400/20 bg-surface p-5 shadow-gold md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl', className)}
                style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              >
                {title ? <Dialog.Title className="h-display pr-8 text-2xl text-white">{title}</Dialog.Title> : <Dialog.Title className="sr-only">Окно</Dialog.Title>}
                {description && <Dialog.Description className="mt-1 text-sm text-white/55">{description}</Dialog.Description>}
                {dismissible && (
                  <Dialog.Close className="absolute right-4 top-4 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Закрыть">
                    <IconClose size={18} />
                  </Dialog.Close>
                )}
                <div className={title ? 'mt-4' : ''}>{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
