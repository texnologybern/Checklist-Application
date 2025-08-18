import { init } from './tasks.js';
import './filters.js';

function setupThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = current;
  toggle.checked = current === 'dark';
  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  init();
});
