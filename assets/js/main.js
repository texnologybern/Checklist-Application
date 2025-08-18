import { init } from './tasks.js';
import './filters.js';
import { el } from './api.js';

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
  setupAddModal();
});

function setupAddModal(){
  const fab = el('#fabBtn');
  const modal = el('#addModal');
  const cancel = el('#modalCancel');
  const save = el('#modalSave');
  if (!fab || !modal) return;
  const show = () => {
    modal.classList.remove('hidden');
    document.body.classList.add('editing-open');
  };
  const hide = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('editing-open');
  };
  fab.addEventListener('click', show);
  cancel?.addEventListener('click', hide);
  save?.addEventListener('click', () => {
    ['Title','Desc','Priority','Tags','Start','Due'].forEach(f => {
      const src = el('#modal' + f);
      const dst = el('#add' + f);
      if (src && dst) dst.value = src.value;
    });
    el('#addBtn')?.click();
    hide();
    ['Title','Desc','Priority','Tags','Start','Due'].forEach(f => {
      const src = el('#modal' + f); if (src) src.value = '';
    });
  });
}
