import { useEffect, useMemo, useState } from 'react';
import './styles/index.css';
import { LoginForm } from './components/LoginForm';
import { ApiAuthService, LocalAuthService } from './services/auth';
import { useAuth } from './hooks/useAuth';
import { ApiLayoutService, LocalLayoutService } from './services/layoutService';
import type { BoardCard } from './features/board/types';
import { DraggableBoard } from './features/board/DraggableBoard';
import { useReducedMotionPref } from './hooks/useReducedMotionPref';

const defaultCards: BoardCard[] = [
  {
    id: 'pre-flight',
    title: 'Pre-arrival checklist',
    body: 'Verify travel schedule, confirm guest preferences, and assign preparatory tasks.',
    tone: 'info'
  },
  {
    id: 'maintenance',
    title: 'Maintenance review',
    body: 'Track outstanding maintenance, schedule vendor visits, and log completion notes.',
    tone: 'warning'
  },
  {
    id: 'inventory',
    title: 'Inventory snapshot',
    body: 'Reconcile consumables and amenities before check-in; flag items needing restock.',
    tone: 'success'
  },
  {
    id: 'handover',
    title: 'Handover checklist',
    body: 'Capture cleaning handoff status, upload notes, and store the final report.',
    tone: 'danger'
  }
];

function App() {
  const reducedMotion = useReducedMotionPref();
  const envPrefersApi = import.meta.env.VITE_USE_API_AUTH !== 'false';
  const apiBase = import.meta.env.VITE_API_BASE || '/saas_api.php';
  const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'default';

  const [authMode, setAuthMode] = useState<'api' | 'local'>(envPrefersApi ? 'api' : 'local');
  const usingApi = authMode === 'api';

  const authService = useMemo(
    () => (usingApi ? new ApiAuthService(apiBase) : new LocalAuthService()),
    [apiBase, usingApi]
  );

  const layoutService = useMemo(
    () => (usingApi ? new ApiLayoutService(apiBase) : new LocalLayoutService()),
    [apiBase, usingApi]
  );

  const { status, session, error, login, logout, clearError } = useAuth(authService);
  const [cards, setCards] = useState<BoardCard[]>(defaultCards);
  const [layoutMessage, setLayoutMessage] = useState<string>('');
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);

  const handleSwitchMode = (mode: 'api' | 'local') => {
    if (mode === authMode) {
      return;
    }
    setAuthMode(mode);
    setCards(defaultCards);
    setLayoutMessage('');
  };

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let canceled = false;
    setLayoutLoading(true);
    layoutService
      .load()
      .then((saved) => {
        if (canceled || !saved || saved.length === 0) {
          return;
        }
        setCards(saved);
      })
      .catch(() => {
        setLayoutMessage('Could not load your saved layout; showing defaults instead.');
      })
      .finally(() => {
        if (!canceled) {
          setLayoutLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [layoutService, status]);

  const handleOrderChange = (next: BoardCard[]) => {
    setCards(next);
    setLayoutMessage('');
  };

  const handlePersistLayout = async () => {
    setLayoutSaving(true);
    setLayoutMessage('');
    try {
      await layoutService.save(cards);
      setLayoutMessage('Layout saved for your workspace.');
    } catch (error) {
      setLayoutMessage(error instanceof Error ? error.message : 'Unable to save layout.');
    } finally {
      setLayoutSaving(false);
    }
  };

  const handleResetLayout = async () => {
    setCards(defaultCards);
    setLayoutMessage('Reset to the default layout.');
    try {
      await layoutService.clear();
    } catch (error) {
      setLayoutMessage(error instanceof Error ? error.message : 'Unable to reset layout.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.25em] text-primary/70">Checklist</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Sign in to continue</h1>
          <p className="text-base text-slate-300">
            Securely access your workspace and keep your dashboard layout synced across devices.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-8">
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => handleSwitchMode('api')}
                className={`rounded-full border px-3 py-1 transition ${
                  usingApi ? 'border-primary/60 bg-primary/10 text-primary-50' : 'border-white/10 hover:border-white/30'
                }`}
              >
                API login
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('local')}
                className={`rounded-full border px-3 py-1 transition ${
                  !usingApi ? 'border-primary/60 bg-primary/10 text-primary-50' : 'border-white/10 hover:border-white/30'
                }`}
              >
                Demo login
              </button>
            </div>

            {status === 'authenticated' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-slate-400">Signed in as</p>
                  <p className="text-lg font-semibold text-white">{session?.email}</p>
                  {session?.tenantSlug && (
                    <p className="text-sm text-slate-400">Workspace: {session.tenantSlug}</p>
                  )}
                </div>
                <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  You are authenticated. Adjust the layout on the right and save it to your account.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-2xl border border-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <LoginForm
                loading={status === 'loading'}
                error={error}
                onSubmit={login}
                onClearError={clearError}
                showTenant={usingApi}
                defaultTenant={tenantSlug}
                backendMode={usingApi ? 'api' : 'local'}
              />
            )}

            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-300">
              {usingApi ? (
                <p>
                  Using API authentication at <span className="font-semibold text-slate-100">{apiBase}</span>. Provide your workspace
                  email, password, and tenant slug to sign in. If you cannot reach the server, switch to Demo login above.
                </p>
              ) : (
                <p>
                  Demo mode is active. Sign in with any email and password <span className="font-semibold text-slate-100">demo-pass1</span>
                  to explore the layout editor locally or switch back to API login when the backend is available.
                </p>
              )}
            </div>
          </section>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/50 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/60">Live preview</p>
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">Workspace layout</h2>
                  <p className="text-sm text-slate-300">Drag to reorder cards or use your keyboard arrows.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-white/5 px-3 py-1">Keyboard friendly</span>
                  <span className="rounded-full bg-white/5 px-3 py-1">Auto-save ready</span>
                  <span className="rounded-full bg-white/5 px-3 py-1">Sync per tenant</span>
                </div>
              </div>

              <DraggableBoard
                cards={cards}
                reducedMotion={reducedMotion}
                onOrderChange={handleOrderChange}
                onResetLayout={handleResetLayout}
                onPersistLayout={handlePersistLayout}
                isPersisting={layoutSaving}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300 shadow-lg shadow-slate-950/30">
              {layoutLoading ? (
                <p>Loading your saved layout…</p>
              ) : (
                <p>
                  Changes stay local until you click <span className="font-semibold text-slate-100">Save layout</span>. Saved layouts are scoped to
                  your tenant so every workspace stays separate.
                </p>
              )}
              {layoutMessage && <p className="text-primary-200">{layoutMessage}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
