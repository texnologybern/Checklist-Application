import { el } from './api.js';

export function showConfirm(msg, onYes, yesLabel='Διαγραφή'){
  const modal = el('#confirmModal');
  if (!modal) return;
  el('#confirmText', modal).textContent = msg;
  const yesBtn = el('#confirmYes', modal);
  const noBtn = el('#confirmNo', modal);
  yesBtn.textContent = yesLabel;
  modal.classList.remove('hidden');
  const cleanup = () => { modal.classList.add('hidden'); yesBtn.onclick = noBtn.onclick = null; };
  noBtn.onclick = cleanup;
  yesBtn.onclick = () => { cleanup(); onYes(); };
}

