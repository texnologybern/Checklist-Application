import { el, API } from './api.js';
import { showConfirm } from './ui.js';

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
  const thread  = el('.notesThread', li);
  const wrapper = el('.taskNotes', li);      // <details>
  const noteInput = el('.noteText', li);     // ✅ Codex change
  const summary = el('summary', wrapper);

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

  // Lazy load όταν εστιάζει το input
  noteInput?.addEventListener('focus', ensureLoaded);

  // Όταν ανοίγει το <details>, φόρτωσε & εστίασε στο input
  wrapper?.addEventListener('toggle', () => {
    if (wrapper.open){
      wrapper.classList.add('opening');
      ensureLoaded();
      noteInput?.focus();
    } else {
      wrapper.classList.remove('opening');
    }
  });

  // Απαλή κατάρρευση όταν κλείνει
  summary?.addEventListener('click', (e) => {
    if (wrapper.open){
      e.preventDefault();
      wrapper.classList.remove('opening');
      const onEnd = () => {
        wrapper.open = false;
      };
      const target = el('.notesThread', wrapper);
      target?.addEventListener('transitionend', onEnd, { once:true });
    }
  });

  thread.addEventListener('click', async (e) => {
    const del = e.target.closest('.noteDel');
    if (del){
      const id = Number(del.dataset.id || 0);
      if (!id) return;
      showConfirm('Διαγραφή αυτής της σημείωσης;', async () => {
        try {
          await API('comment_delete', { id });
          del.closest('.noteItem')?.remove();
        } catch (err) {
          alert(err.message);
        }
      });
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
