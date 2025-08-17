import { el, API } from './api.js';

function escapeHtml(s){ return (s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function renderNoteItem(n){
  const id   = Number(n.id || 0);
  const body = escapeHtml(n.body || '');
  const at   = escapeHtml(n.created_at_fmt || '');
  return `
    <div class="noteItem" data-id="${id}">
      <div class="noteRow">
        <div class="noteText">${body}</div>
        <button class="noteDel" data-id="${id}" title="Διαγραφή">🗑️</button>
      </div>
      <div class="noteMeta">${at}</div>
    </div>
  `;
}

export function initNotes(li, task){
  const thread = el('.notesThread', li);
  const wrapper = el('.taskNotes', li);
  const noteInput = el('.noteText', li);
  const ensureLoaded = async () => {
    if (thread.dataset.loaded === '1') return;
    try {
      const { notes } = await API('comments', null, { task_id: task.id });
      thread.innerHTML = notes.map(renderNoteItem).join('');
      thread.dataset.loaded = '1';
    } catch (err) {
      console.warn(err.message);
    }
  };
  noteInput?.addEventListener('focus', ensureLoaded);
  wrapper?.addEventListener('toggle', () => {
    if (wrapper.open){
      ensureLoaded();
      noteInput?.focus();
    }
  });

  thread.addEventListener('click', async (e) => {
    const del = e.target.closest('.noteDel');
    if (del){
      const id = Number(del.dataset.id || 0);
      if (!id) return;
      if (!confirm('Διαγραφή αυτής της σημείωσης;')) return;
      try {
        await API('comment_delete', { id });
        del.closest('.noteItem')?.remove();
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    ensureLoaded();
  });

  const addNote = async () => {
    const inp = el('.noteText', li);
    const body = inp.value.trim();
    if (!body) return;
    try {
      const { note } = await API('comment_add', { task_id: task.id, body });
      thread.insertAdjacentHTML('afterbegin', renderNoteItem(note));
      thread.dataset.loaded = '1';
      inp.value = '';
    } catch (err) {
      alert(err.message);
    }
  };
  el('.noteText', li).addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addNote(); }
  });
  el('.noteAddBtn', li).addEventListener('click', addNote);
}
