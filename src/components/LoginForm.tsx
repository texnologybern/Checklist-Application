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
  backendMode?: 'api' | 'local';
}

type FieldErrors = Partial<Record<'email' | 'password' | 'tenant', string>>;

const initialForm: AuthCredentials = {
  email: '',
  password: '',
  remember: true,
  tenant: ''
};

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
  const [form, setForm] = useState<AuthCredentials>({ ...initialForm, tenant: defaultTenant });
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

    if (form.password.length < 1) {
      nextErrors.password = 'Please enter your password.';
    }

    if (showTenant && (!form.tenant || form.tenant.trim().length === 0)) {
        nextErrors.tenant = 'Workspace URL is required.';
    }

    return nextErrors;
  }, [form.email, form.password, form.tenant, showTenant]);

  const handleChange = (key: keyof AuthCredentials) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = key === 'remember' ? event.currentTarget.checked : event.currentTarget.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitted(false);

    if (error) {
      onClearError();
    }
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
        <p className="text-sm uppercase tracking-[0.2em] text-primary/70">Checklist App</p>
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Sign in</h1>
        <p className="text-sm text-slate-400">
          {backendMode === 'local' 
            ? <span>Use demo password <span className="font-medium text-slate-200">demo-pass1</span></span>
            : <span>Enter your workspace credentials</span>}
        </p>
      </header>

      {error ? (
        <motion.p
          role="alert"
          aria-live="polite"
          ref={errorRef}
          tabIndex={-1}
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      ) : (
        <p role="status" aria-live="polite" className="sr-only">
          {loading ? 'Signing in…' : 'Ready to sign in'}
        </p>
      )}

      <div className="space-y-4">
        {showTenant && (
            <div className="flex flex-col gap-2">
            <label htmlFor="tenant" className="text-sm font-medium text-slate-200">
                Workspace Slug
            </label>
            <input
                id="tenant"
                type="text"
                autoComplete="organization"
                required
                value={form.tenant}
                onChange={handleChange('tenant')}
                className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 transition focus:border-primary/60 focus:bg-slate-900"
            />
            {fieldErrors.tenant && (
                <p className="text-sm text-red-300" role="alert">
                {fieldErrors.tenant}
                </p>
            )}
            </div>
        )}

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
      </div>

      <div className="flex flex-col items-start justify-between gap-4 text-sm text-slate-300 sm:flex-row sm:items-center">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-primary focus:ring-offset-slate-900 cursor-pointer"
            checked={form.remember ?? false}
            onChange={handleChange('remember')}
          />
          <span>Remember me</span>
        </label>
      </div>

      <button
        type="submit"
        className="mt-2 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-transform duration-200 will-change-transform focus-visible:scale-100 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto active:scale-95"
        style={{ transform: 'translate3d(0,0,0)' }}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </motion.form>
  );
};