import { init } from './tasks.js';
import './filters.js';

function setupThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const meta = document.querySelector('meta[name="theme-color"]');

  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#2563eb');
    toggle.checked = theme === 'dark';
  };

  const stored = localStorage.getItem('theme');
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
