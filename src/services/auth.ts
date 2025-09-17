export interface AuthCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthSession {
  id: string;
  email: string;
  displayName: string;
  token: string;
  lastAuthenticatedAt: number;
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
