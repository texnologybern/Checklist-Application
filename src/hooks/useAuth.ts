import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthCredentials, AuthService, AuthSession } from '../services/auth';

type AuthStatus = 'idle' | 'loading' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
}

export interface UseAuthResult extends AuthState {
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (service: AuthService): UseAuthResult => {
  const [state, setState] = useState<AuthState>({ status: 'idle', session: null, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    service
      .getSession()
      .then((session) => {
        if (!mountedRef.current || !session) {
          return;
        }

        setState({ status: 'authenticated', session, error: null });
      })
      .catch(() => {
        // ignore silent failures; the UI will show the login form
      });

    return () => {
      mountedRef.current = false;
    };
  }, [service]);

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const session = await service.login(credentials);
        if (!mountedRef.current) {
          return;
        }

        setState({ status: 'authenticated', session, error: null });
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setState({ status: 'idle', session: null, error: error instanceof Error ? error.message : 'Login failed.' });
      }
    },
    [service]
  );

  const logout = useCallback(async () => {
    await service.logout();
    if (!mountedRef.current) {
      return;
    }

    setState({ status: 'idle', session: null, error: null });
  }, [service]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      login,
      logout,
      clearError
    }),
    [clearError, login, logout, state]
  );
};
