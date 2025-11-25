import { Reorder, motion, useMotionValue, useTransform } from 'framer-motion';
import { KeyboardEvent } from 'react';
import type { BoardCard } from './types';
import { classNames } from '../../utils/classNames';

interface SortableCardProps {
  card: BoardCard;
  reducedMotion: boolean;
  onKeyboardReorder: (id: string, direction: 'up' | 'down') => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isActive: boolean;
  key?: string;
}

const toneStyles: Record<BoardCard['tone'], string> = {
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-500/40 bg-rose-500/10 text-rose-100'
};

export const SortableCard = ({
  card,
  reducedMotion,
  onKeyboardReorder,
  onDragStart,
  onDragEnd,
  isActive
}: SortableCardProps) => {
  const y = useMotionValue(0);
  const boxShadow = useTransform(y, (latest) => {
    const intensity = Math.min(0.35, Math.abs(latest) / 200);
    return `0 20px 45px rgba(15, 23, 42, ${0.18 + intensity})`;
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardReorder(card.id, 'up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardReorder(card.id, 'down');
    }
  };

  return (
    <Reorder.Item
      value={card}
      id={card.id}
      dragListener
      style={{ y, boxShadow, transform: 'translateZ(0)' }}
      className="will-change-transform"
      as="div"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <motion.div
        layout
        role="listitem"
        tabIndex={0}
        aria-label={`${card.title} card`}
        aria-roledescription="Draggable card"
        onKeyDown={handleKeyDown}
        className={classNames(
          'group flex cursor-grab touch-none select-none flex-col gap-3 rounded-3xl border p-5 text-left transition active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          toneStyles[card.tone],
          isActive ? 'ring-2 ring-primary/80 ring-offset-2 ring-offset-slate-900' : 'shadow-lg shadow-slate-950/30'
        )}
        animate={{ scale: isActive ? 1.02 : 1, opacity: isActive ? 0.96 : 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      >
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-lg font-semibold leading-tight text-white drop-shadow">{card.title}</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/80 sm:text-xs">
            Drag or use arrows
          </span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{card.body}</p>
      </motion.div>
    </Reorder.Item>
  );
};
