import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { DraggableBoard } from './features/board/DraggableBoard';
import type { BoardCard } from './features/board/types';
import { useAuth } from './hooks/useAuth';
import { useReducedMotionPref } from './hooks/useReducedMotionPref';
import { LocalAuthService } from './services/auth';
import { LocalLayoutService } from './services/layoutService';

const defaultCards: BoardCard[] = [
  {
    id: 'prep',
    title: 'Pre-arrival checklist',
    body: 'Review bookings, sync stakeholders, and share arrival instructions with guests or teammates.',
    tone: 'info'
  },
  {
    id: 'maintenance',
    title: 'Maintenance queue',
    body: 'Track outstanding repairs, assign the next task, and log ETA updates for service providers.',
    tone: 'warning'
  },
  {
    id: 'inventory',
    title: 'Inventory snapshot',
    body: 'Audit supplies, flag restock priorities, and record vendor orders for transparency.',
    tone: 'success'
  },
  {
    id: 'handover',
    title: 'Handover notes',
    body: 'Capture shift summaries, escalations, and context for whoever signs in next.',
    tone: 'danger'
  }
];

/**
 * The top-level app wires together the domain services and the UI primitives. To
 * hook this up to real infrastructure replace LocalAuthService and
 * LocalLayoutService with adapters that satisfy the same interfaces. No UI
 * changes are required thanks to those abstractions.
 */
const App = () => {
  const reducedMotion = useReducedMotionPref();
  const authService = useMemo(() => new LocalAuthService(), []);
  const layoutService = useMemo(() => new LocalLayoutService(), []);
  const { status, session, login, logout, error, clearError } = useAuth(authService);
  const [cards, setCards] = useState<BoardCard[]>(defaultCards);
  const [isPersisting, setIsPersisting] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      setCards(defaultCards);
      return;
    }

    let cancelled = false;
    layoutService
      .load()
      .then((stored) => {
        if (cancelled || !stored) {
          return;
        }

        setCards(stored);
      })
      .catch(() => {
        /* Swallow errors so the UI remains interactive */
      });

    return () => {
      cancelled = true;
    };
  }, [layoutService, status]);

  const handleOrderChange = useCallback((next: BoardCard[]) => {
    setCards(next);
  }, []);

  const handleResetLayout = useCallback(() => {
    setCards(defaultCards);
    layoutService.clear().catch(() => {
      /* no-op: keep UI responsive */
    });
  }, [layoutService]);

  const handlePersistLayout = useCallback(async () => {
    setIsPersisting(true);
    try {
      await layoutService.save(cards);
    } finally {
      setIsPersisting(false);
    }
  }, [cards, layoutService]);

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-5xl grow flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <main className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="flex w-full max-w-xl justify-center">
            <LoginForm loading={status === 'loading'} error={error} onSubmit={login} onClearError={clearError} />
          </div>

          <div className="flex w-full max-w-xl flex-col gap-6">
            <section className="rounded-3xl bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6">
              <header className="mb-4 space-y-2 text-center sm:text-left">
                <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Live preview</p>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">Workspace layout</h2>
                <p className="text-sm text-slate-400">
                  {status === 'authenticated'
                    ? `Signed in as ${session?.displayName}. Drag cards to personalise your dashboard.`
                    : 'Sign in to unlock layout persistence and collaborative features.'}
                </p>
              </header>

              {status !== 'authenticated' ? (
                <p className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-400 sm:p-6">
                  Arrange the demo cards even before signing in. We keep mutations local until you authenticate.
                </p>
              ) : null}
            </section>

            <DraggableBoard
              cards={cards}
              reducedMotion={reducedMotion}
              onOrderChange={handleOrderChange}
              onResetLayout={handleResetLayout}
              onPersistLayout={handlePersistLayout}
              isPersisting={isPersisting}
            />

            <section
              aria-labelledby="how-to-extend"
              className="rounded-3xl bg-slate-900/60 p-5 text-sm text-slate-300 shadow-xl shadow-slate-950/30 backdrop-blur sm:p-6"
            >
              <h2 id="how-to-extend" className="text-lg font-semibold text-white sm:text-xl">
                How to extend
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <span className="font-medium text-slate-100">Authentication:</span> replace <code>LocalAuthService</code> with an
                  adapter that calls your API. Keep the <code>AuthService</code> contract intact and the UI stays unchanged.
                </li>
                <li>
                  <span className="font-medium text-slate-100">Persistence:</span> implement <code>LayoutService</code> against REST,
                  GraphQL, or IndexedDB. Save and load methods are already awaited.
                </li>
                <li>
                  <span className="font-medium text-slate-100">Card types:</span> extend <code>BoardCard</code> with new attributes and
                  branch inside <code>SortableCard</code> to render specialised layouts.
                </li>
              </ul>
            </section>
          </div>
        </main>

        {status === 'authenticated' ? (
          <button
            type="button"
            onClick={logout}
            className="mt-10 rounded-2xl border border-slate-700/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
          >
            Sign out
          </button>
        ) : null}
      </div>

      <footer className="px-6 pb-8 text-center text-xs text-slate-500">
        Crafted with accessibility-first patterns. Animations respect reduced-motion preferences.
      </footer>
    </div>
  );
};

export default App;
