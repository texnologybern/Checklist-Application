import { init } from './tasks.js';
import './filters.js';

function setupThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const meta = document.querySelector('meta[name="theme-color"]');

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, val) {
      try { localStorage.setItem(key, val); } catch {}
    }
  };

  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    storage.set('theme', theme);
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#2563eb');
    toggle.checked = theme === 'dark';
  };

  const stored = storage.get('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(stored || (prefersDark ? 'dark' : 'light'));
  const handler = () => apply(toggle.checked ? 'dark' : 'light');
  toggle.addEventListener('change', handler);
  toggle.addEventListener('input', handler);
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  init();
});
