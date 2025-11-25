import { Reorder } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { SortableCard } from './SortableCard';
import type { BoardCard } from './types';

interface DraggableBoardProps {
  cards: BoardCard[];
  reducedMotion: boolean;
  onOrderChange: (cards: BoardCard[]) => void;
  onResetLayout: () => void;
  onPersistLayout: () => Promise<void>;
  isPersisting: boolean;
}

export const DraggableBoard = ({
  cards,
  reducedMotion,
  onOrderChange,
  onResetLayout,
  onPersistLayout,
  isPersisting
}: DraggableBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyboardReorder = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const currentIndex = cards.findIndex((card) => card.id === id);
      if (currentIndex === -1) {
        return;
      }

      const swapWith = direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(cards.length - 1, currentIndex + 1);
      if (swapWith === currentIndex) {
        return;
      }

      const next = [...cards];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(swapWith, 0, moved);
      onOrderChange(next);
    },
    [cards, onOrderChange]
  );

  return (
    <section
      className="flex w-full flex-col gap-6 rounded-3xl bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-8"
      aria-label="Layout editor"
    >
      <header className="flex flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Arrange your workspace</h2>
          <p className="leading-relaxed text-slate-300/90">
            Drag the cards or use the arrow keys while focused on a card. Press Escape to cancel a drag.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onResetLayout}
            className="w-full rounded-2xl border border-slate-700/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 sm:w-auto"
          >
            Reset layout
          </button>
          <button
            type="button"
            onClick={onPersistLayout}
            disabled={isPersisting}
            className="w-full rounded-2xl bg-primary/80 px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            style={{ transform: 'translate3d(0,0,0)' }}
          >
            {isPersisting ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </header>

      <Reorder.Group
        axis="y"
        values={cards}
        onReorder={onOrderChange}
        // @ts-expect-error Type shims keep framer-motion markup permissive in this environment
        className="grid gap-4 sm:grid-cols-2"
        as="div"
      >
        {cards.map((card) => (
          <SortableCard
            key={card.id}
            card={card}
            reducedMotion={reducedMotion}
            onKeyboardReorder={handleKeyboardReorder}
            onDragStart={() => setActiveId(card.id)}
            onDragEnd={() => setActiveId(null)}
            isActive={activeId === card.id}
          />
        ))}
      </Reorder.Group>

      <p className="sr-only" aria-live="polite">
        {activeId ? `Dragging ${cards.find((card) => card.id === activeId)?.title ?? 'card'}.` : 'Reordering idle.'}
      </p>
    </section>
  );
};
