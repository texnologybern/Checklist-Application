export const el = (sel, root = document) => root.querySelector(sel);
export const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const CSRF = () => document.querySelector('meta[name="csrf-token"]').content;
export const LIST_ID = Number(new URLSearchParams(location.search).get('list_id') || 1);

export const API = (action, payload, params = {}) => {
  const url = new URL('api.php', window.location.href);
  url.searchParams.set('action', action);
  url.searchParams.set('list_id', params.list_id || LIST_ID);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (k !== 'list_id') url.searchParams.set(k, v);
  });
  const opts = payload
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF() }, body: JSON.stringify(payload) }
    : { headers: { 'X-CSRF-Token': CSRF() } };
  return fetch(url.toString(), opts)
    .then(r => r.json())
    .then(j => { if (!j.ok) throw new Error(j.error || 'Σφάλμα'); return j; });
};
