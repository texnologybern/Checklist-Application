import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { AuthCredentials } from '../services/auth';

interface LoginFormProps {
  loading: boolean;
  error: string | null;
  onSubmit: (credentials: AuthCredentials) => Promise<void>;
  onClearError: () => void;
  showTenant?: boolean;
  defaultTenant?: string;
  backendMode?: 'local' | 'api';
}

type FieldErrors = Partial<Record<'email' | 'password', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginForm = ({
  loading,
  error,
  onSubmit,
  onClearError,
  showTenant = false,
  defaultTenant = 'default',
  backendMode = 'local'
}: LoginFormProps) => {
  const [form, setForm] = useState<AuthCredentials>({
    email: '',
    password: '',
    remember: true,
    tenant: defaultTenant
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!error) {
      return;
    }

    errorRef.current?.focus();
  }, [error]);

  const validations = useMemo(() => {
    const nextErrors: FieldErrors = {};

    if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address to continue.';
    }

    if (form.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    } else if (!/\d/.test(form.password)) {
      nextErrors.password = 'Include at least one number for a stronger password.';
    }

    return nextErrors;
  }, [form.email, form.password]);

  const handleChange = (key: keyof AuthCredentials) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: key === 'remember' ? event.currentTarget.checked : event.currentTarget.value }));
    setSubmitted(false);

    if (error) {
      onClearError();
    }
  };

  const handlePrefillDemo = () => {
    setForm({ email: 'admin@demo.test', password: 'demo-pass1', remember: true, tenant: defaultTenant });
    setFieldErrors({});
    setSubmitted(false);
    onClearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (Object.keys(validations).length > 0) {
      setFieldErrors(validations);
      return;
    }

    setFieldErrors({});
    await onSubmit(form);
  };

  useEffect(() => {
    if (!submitted) {
      return;
    }

    setFieldErrors(validations);
  }, [submitted, validations]);

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-slate-900/80 p-6 text-left shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-8"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' }}
      noValidate
    >
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.2em] text-primary/70">Checklist</p>
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Sign in to continue</h1>
        <p className="text-sm text-slate-400">
          Use the demo password <span className="font-medium text-slate-200">demo-pass1</span>. Replace the auth service to wire
          real credentials when ready.
        </p>
      </header>

      {error ? (
        <motion.p
          role="alert"
          aria-live="polite"
          ref={errorRef}
          tabIndex={-1}
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      ) : (
        <p role="status" aria-live="polite" className="sr-only">
          {loading ? 'Signing in…' : 'Ready'}
        </p>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            onBlur={() => setFieldErrors(validations)}
            className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 transition focus:border-primary/60 focus:bg-slate-900"
          />
          {fieldErrors.email && (
            <p className="text-sm text-red-300" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange('password')}
            onBlur={() => setFieldErrors(validations)}
            className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 transition focus:border-primary/60 focus:bg-slate-900"
          />
          {fieldErrors.password && (
            <p className="text-sm text-red-300" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {showTenant ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="tenant" className="text-sm font-medium text-slate-200">
              Workspace (tenant) slug
            </label>
            <input
              id="tenant"
              type="text"
              autoComplete="organization"
              value={form.tenant ?? ''}
              onChange={handleChange('tenant')}
              className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 transition focus:border-primary/60 focus:bg-slate-900"
            />
            <p className="text-sm text-slate-400">
              Use <code className="font-mono text-slate-200">{defaultTenant}</code> unless you created a different workspace with
              the CLI.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 text-sm text-slate-300 sm:flex-row sm:items-center">
        <label className="inline-flex items-center gap-2">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-primary focus:ring-offset-slate-900"
            checked={form.remember ?? false}
            onChange={handleChange('remember')}
          />
          <span>Remember this device</span>
        </label>
        <button
          type="button"
          className="text-primary/80 hover:text-primary"
          onClick={() => setForm({ email: '', password: '', remember: true, tenant: defaultTenant })}
        >
          Clear form
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Need a quick login?</p>
            <p className="text-sm text-slate-200">
              Use <span className="font-semibold text-white">admin@demo.test</span> and <span className="font-semibold text-white">demo-pass1</span>
              {showTenant ? (
                <>
                  {' '}for workspace <span className="font-mono text-white">{defaultTenant}</span>.
                </>
              ) : (
                '.'
              )}
            </p>
            {backendMode === 'api' ? (
              <p className="text-xs text-slate-400">
                If login fails, ensure the PHP server is running (e.g. <code className="font-mono text-slate-200">php -S 0.0.0.0:8000</code>) and that
                <code className="font-mono text-slate-200">VITE_USE_API_AUTH=true</code> points to the correct URL.
              </p>
            ) : (
              <p className="text-xs text-slate-400">Local demo mode stores the session in your browser only.</p>
            )}
          </div>
          <button
            type="button"
            onClick={handlePrefillDemo}
            className="rounded-xl border border-primary/50 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Fill demo details
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-transform duration-200 will-change-transform focus-visible:scale-100 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        style={{ transform: 'translate3d(0,0,0)' }}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </motion.form>
  );
};
