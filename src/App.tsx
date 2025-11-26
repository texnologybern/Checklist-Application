export interface AuthCredentials {
  email: string;
  password: string;
  remember?: boolean;
  tenant?: string;
}

export interface AuthSession {
  id: string;
  email: string;
  displayName: string;
  token: string;
  lastAuthenticatedAt: number;
  tenantId?: number;
  tenantSlug?: string;
  roles?: string[];
  subscription?: { plan: string; status: string; seats?: number; endsAt?: string | null } | null;
}

export interface AuthService {
  login(credentials: AuthCredentials): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}

const SESSION_KEY = 'checklist-app:session';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * LocalAuthService simulates an authentication provider. The async boundaries and
 * token handling mirror what a real HTTP API would do so we can swap the
 * implementation without touching the UI. Swap the internals with a fetch call
 * (or SDK) and keep the interface intact.
 */
export class LocalAuthService implements AuthService {
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null) {
    this.storage = storage;
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    await delay(320); // simulate the network boundary for skeleton/loading states

    const trimmedEmail = credentials.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    if (credentials.password.length < 8) {
      throw new Error('Passwords must be at least 8 characters long.');
    }

    if (!/\d/.test(credentials.password)) {
      throw new Error('The password must include at least one number.');
    }

    if (credentials.password !== 'demo-pass1') {
      throw new Error('Invalid email or password.');
    }

    const session: AuthSession = {
      id: crypto.randomUUID(),
      email: trimmedEmail,
      displayName: trimmedEmail.split('@')[0],
      token: crypto.randomUUID(),
      lastAuthenticatedAt: Date.now()
    };

    if (credentials.remember && this.storage) {
      this.storage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return session;
  }

  async getSession(): Promise<AuthSession | null> {
    if (!this.storage) {
      return null;
    }

    const raw = this.storage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      return session;
    } catch (error) {
      this.storage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.storage) {
      this.storage.removeItem(SESSION_KEY);
    }
  }
}

export class ApiAuthService implements AuthService {
  private readonly baseUrl: string;
  private csrf: string | null = null;

  constructor(baseUrl = '/saas_api.php') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {})
        },
        ...init
      });
    } catch (error) {
      const message = `Cannot reach the API at ${this.baseUrl}. Start the PHP server (e.g. php -S 0.0.0.0:8000) or set VITE_USE_API_AUTH=false to use local demo mode.`;
      throw new Error(message);
    }

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || 'Request failed');
    }

    if (data.csrf) {
      this.csrf = data.csrf;
    }

    return data as T;
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    // Χρησιμοποιούμε import.meta.env αντί για process.env στο Vite
    const tenant = credentials.tenant || import.meta.env.VITE_TENANT_SLUG || 'default';
    const payload = { ...credentials, tenant };

    const data = await this.request<any>(`?action=login`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const subscription = data.subscription
      ? {
          plan: data.subscription.plan ?? 'free',
          status: data.subscription.status ?? 'active',
          seats: data.subscription.seats ?? undefined,
          endsAt: data.subscription.ends_at ?? null
        }
      : null;

    return {
      id: String(data.user.id),
      email: data.user.email,
      displayName: data.user.displayName ?? data.user.email,
      token: data.csrf || crypto.randomUUID(),
      lastAuthenticatedAt: Date.now(),
      tenantId: data.tenant?.id,
      tenantSlug: data.tenant?.slug,
      roles: data.user.roles ?? [],
      subscription
    };
  }

  async getSession(): Promise<AuthSession | null> {
    try {
      const data = await this.request<any>(`?action=me`, { method: 'GET' });

      const subscription = data.subscription
        ? {
            plan: data.subscription.plan ?? 'free',
            status: data.subscription.status ?? 'active',
            seats: data.subscription.seats ?? undefined,
            endsAt: data.subscription.ends_at ?? null
          }
        : null;

      return {
        id: String(data.user.id),
        email: data.user.email,
        displayName: data.user.displayName ?? data.user.email,
        token: data.csrf || crypto.randomUUID(),
        lastAuthenticatedAt: Date.now(),
        tenantId: data.tenant?.id,
        tenantSlug: data.tenant?.slug,
        roles: data.user.roles ?? [],
        subscription
      };
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request(`?action=logout`, { method: 'POST' });
    } finally {
      this.csrf = null;
    }
  }
}