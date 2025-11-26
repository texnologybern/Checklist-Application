import type { BoardCard } from '../features/board/types';

export interface LayoutService {
  load(): Promise<BoardCard[] | null>;
  save(cards: BoardCard[]): Promise<void>;
  clear(): Promise<void>;
}

const LAYOUT_KEY = 'checklist-app:layout';

export class LocalLayoutService implements LayoutService {
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null) {
    this.storage = storage;
  }

  async load(): Promise<BoardCard[] | null> {
    if (!this.storage) {
      return null;
    }

    const raw = this.storage.getItem(LAYOUT_KEY);
    if (!raw) {
      return null;
    }

    try {
      const layout = JSON.parse(raw) as BoardCard[];
      return layout;
    } catch (error) {
      this.storage.removeItem(LAYOUT_KEY);
      return null;
    }
  }

  async save(cards: BoardCard[]): Promise<void> {
    if (!this.storage) {
      return;
    }

    this.storage.setItem(LAYOUT_KEY, JSON.stringify(cards));
  }

  async clear(): Promise<void> {
    if (!this.storage) {
      return;
    }

    this.storage.removeItem(LAYOUT_KEY);
  }
}

export class ApiLayoutService implements LayoutService {
  private readonly baseUrl: string;

  constructor(baseUrl = '/saas_api.php') {
    this.baseUrl = baseUrl;
  }

  async load(): Promise<BoardCard[] | null> {
    const res = await fetch(`${this.baseUrl}?action=layout_load`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || 'Unable to load layout');
    }

    return data.layout as BoardCard[] | null;
  }

  async save(cards: BoardCard[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}?action=layout_save`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: cards })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || 'Unable to save layout');
    }
  }

  async clear(): Promise<void> {
    const res = await fetch(`${this.baseUrl}?action=layout_clear`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || 'Unable to clear layout');
    }
  }
}
