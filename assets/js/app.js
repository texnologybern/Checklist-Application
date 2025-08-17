/* Paros Checklist – rich client (edit + comments + dnd + filters) */
const el  = (sel, root=document) => root.querySelector(sel);
const els = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const CSRF   = () => document.querySelector('meta[name="csrf-token"]').content;
const LIST_ID = Number(new URLSearchParams(location.search).get('list_id') || 1);

const API = (action, payload, params = {}) => {
  const url = new URL('api.php', window.location.href);
  url.searchParams.set('action', action);
  url.searchParams.set('list_id', params.list_id || LIST_ID);
  // έξτρα παραμέτροι (π.χ. task_id)
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

function escapeHtml(s){ return (s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(s){ return (s||'').replace(/"/g, '&quot;'); }

let BOOT = null;

function prioBadge(p){
  const map = {1:'Υψηλή',2:'Μεσαία',3:'Χαμηλή'};
  const b = document.createElement('span');
  b.className = 'badge p' + (p || 2);
  b.textContent = map[p || 2];
  return b;
}
function renderChips(tags){
  const parts = (tags || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return '<div class="chips"></div>';
  return '<div class="chips">' + parts.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('') + '</div>';
}

function taskItem(t){
  const li = document.createElement('li');
  li.className = 'task';
  li.dataset.id = t.id;
  li.dataset.priority = t.priority || 2;
  li.dataset.tags = (t.tags || '').toLowerCase();
  li.dataset.start_date = t.start_date || '';
  li.dataset.due_date   = t.due_date || '';
  li.draggable = true;
  if (t.checked) li.classList.add('done');

  const datesLine = (t.start_date || t.due_date)
    ? `<div class="dates">${t.start_date ? `<span class=\"start\" title=\"Ημερομηνία έναρξης\">Έναρξη ${escapeHtml(t.start_date)}</span>` : ''}${t.start_date && t.due_date ? ' – ' : ''}${t.due_date ? `<span class=\"due\" title=\"Διορία\">Διορία ${escapeHtml(t.due_date)}</span>` : ''}</div>`
    : '';

  li.innerHTML = `
    <div class="handle" title="Μετακίνηση">≡</div>
    <input type="checkbox" ${t.checked ? 'checked' : ''} />
    <div class="content">
      <div class="titleRow">
        <label class="titleText">${escapeHtml(t.title)}</label>
        ${prioBadge(t.priority).outerHTML}
      </div>
      <div class="desc">${escapeHtml(t.description || '')}</div>
      ${datesLine}
      ${renderChips(t.tags)}

      <div class="addNote">
        <input class="noteText" placeholder="Νέα σημείωση… (Enter για αποθήκευση)">
        <button class="noteAddBtn" title="Προσθήκη">➕</button>
      </div>
      <div class="notesThread" data-loaded="0"></div>

      <div class="editForm hidden">
        <div class="row">
          <input class="editTitle" placeholder="Τίτλος" value="${escapeAttr(t.title)}">
          <textarea class="editDesc" placeholder="Περιγραφή">${escapeHtml(t.description || '')}</textarea>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <input class="editTags" placeholder="Ετικέτες (π.χ. Ηλεκτρικά,Μπάνιο)" value="${escapeAttr(t.tags || '')}">
            <select class="editPriority">
              <option value="1" ${t.priority==1?'selected':''}>Υψηλή</option>
              <option value="2" ${!t.priority||t.priority==2?'selected':''}>Μεσαία</option>
              <option value="3" ${t.priority==3?'selected':''}>Χαμηλή</option>
            </select>
          </div>
          <div class="dateInputs">
            <input class="editStart" type="date" value="${escapeAttr(t.start_date || '')}" placeholder="Έναρξη" title="Ημερομηνία έναρξης">
            <input class="editDue" type="date" value="${escapeAttr(t.due_date || '')}" placeholder="Διορία" title="Διορία">
          </div>
          <div class="editBtns">
            <button class="saveEdit success">Αποθήκευση</button>
            <button class="cancelEdit">Άκυρο</button>
          </div>
        </div>
      </div>
    </div>
    <div class="actions">
      <button class="edit" title="Επεξεργασία">✎</button>
      <button class="del" title="Διαγραφή">🗑️</button>
    </div>
  `;

  /* Toggle */
  el('input[type="checkbox"]', li).addEventListener('change', async e => {
    try {
      await API('toggle', { id: t.id, checked: e.target.checked });
      li.classList.toggle('done', e.target.checked);
      refreshProgress();
    } catch (err) { alert(err.message); e.target.checked = !e.target.checked; }
  });

  /* Delete */
  el('.del', li).addEventListener('click', async () => {
    if (!confirm('Διαγραφή εργασίας;')) return;
    try { await API('delete', { id: t.id }); li.remove(); refreshProgress(); }
    catch (err) { alert(err.message); }
  });

  /* Edit open/close */
  const content = el('.content', li);
  const form = el('.editForm', li);
  el('.edit', li).addEventListener('click', () => {
    form.classList.remove('hidden');
    content.querySelector('.titleRow').classList.add('hidden');
    content.querySelector('.desc').classList.add('hidden');
    const chips = content.querySelector('.chips'); if (chips) chips.classList.add('hidden');
  });
  el('.cancelEdit', li).addEventListener('click', () => {
    form.classList.add('hidden');
    content.querySelector('.titleRow').classList.remove('hidden');
    content.querySelector('.desc').classList.remove('hidden');
    const chips = content.querySelector('.chips'); if (chips) chips.classList.remove('hidden');
  });
  el('.saveEdit', li).addEventListener('click', async () => {
    const title = el('.editTitle', li).value.trim();
    if (!title) { alert('Γράψε τίτλο'); return; }
    const description = el('.editDesc', li).value.trim();
    const tags = el('.editTags', li).value.trim();
    const priority = Number(el('.editPriority', li).value || 2);
    const start_date = el('.editStart', li).value;
    const due_date = el('.editDue', li).value;
    try {
      await API('update_task', { id: t.id, title, description, tags, priority, start_date, due_date });
      // update UI
      el('.titleText', li).textContent = title;
      el('.desc', li).textContent = description;
      li.dataset.priority = String(priority);
      li.dataset.tags = tags.toLowerCase();
      li.dataset.start_date = start_date || '';
      li.dataset.due_date = due_date || '';
      const oldBadge = el('.titleRow .badge', li); if (oldBadge) oldBadge.remove();
      el('.titleRow', li).insertAdjacentElement('beforeend', prioBadge(priority));
      const oldChips = el('.chips', li); if (oldChips) oldChips.remove();
      el('.desc', li).insertAdjacentHTML('afterend', renderChips(tags));
      const oldDates = el('.dates', li); if (oldDates) oldDates.remove();
      const datesLine = (start_date || due_date)
        ? `<div class="dates">${start_date ? `<span class=\"start\" title=\"Ημερομηνία έναρξης\">Έναρξη ${escapeHtml(start_date)}</span>` : ''}${start_date && due_date ? ' – ' : ''}${due_date ? `<span class=\"due\" title=\"Διορία\">Διορία ${escapeHtml(due_date)}</span>` : ''}</div>`
        : '';
      el('.desc', li).insertAdjacentHTML('afterend', datesLine);
      el('.cancelEdit', li).click();
      applyFilters();
    } catch (err) { alert(err.message); }
  });

  /* Notes (timeline) */
  const thread = el('.notesThread', li);
  const ensureLoaded = async () => {
    if (thread.dataset.loaded === '1') return;
    try {
      const { notes } = await API('comments', null, { task_id: t.id });
      thread.innerHTML = notes.map(renderNoteItem).join('');
      thread.dataset.loaded = '1';
    } catch (err) {
      // Αν δεν είναι ενεργοποιημένες οι σημειώσεις στο API, απλά αγνόησε το σφάλμα
      console.warn(err.message);
    }
  };
  el('.noteText', li).addEventListener('focus', ensureLoaded);

// delegation: click μέσα στο thread -> delete ή lazy-load
thread.addEventListener('click', async (e) => {
  const del = e.target.closest('.noteDel');
  if (del) {
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
  // αλλιώς απλό κλικ → φόρτωση thread αν δεν έχει φορτωθεί
  ensureLoaded();
});


  const addNote = async () => {
    const inp = el('.noteText', li);
    const body = inp.value.trim();
    if (!body) return;
    try {
      const { note } = await API('comment_add', { task_id: t.id, body });
      thread.insertAdjacentHTML('afterbegin', renderNoteItem(note));
      thread.dataset.loaded = '1';
      inp.value = '';
    } catch (err) {
      alert(err.message); // π.χ. "Notes not enabled"
    }
  };
  el('.noteText', li).addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addNote(); }
  });
  el('.noteAddBtn', li).addEventListener('click', addNote);

  /* Drag & drop */
  li.addEventListener('dragstart', e => { li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  li.addEventListener('dragend',   async () => { li.classList.remove('dragging'); await sendOrder(); });

  return li;
}

// function renderNoteItem(n){
//   const body = escapeHtml(n.body || '');
//   const at   = escapeHtml(n.created_at_fmt || '');
//   return `<div class="noteItem"><div class="noteText">${body}</div><div class="noteMeta">${at}</div></div>`;
// }

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

/* ==== Bootstrap / render ==== */
async function load(){
  try {
    const data = await API('bootstrap'); BOOT = data; render(data);
  } catch (err) {
    if (BOOT) render(BOOT);
    else alert('Αποτυχία φόρτωσης: ' + err.message);
  }
}
function render(data){
  const list = el('#taskList'); list.innerHTML = '';
  (data.tasks || []).forEach(t => list.appendChild(taskItem(t)));
  el('#dateField').value = data.meta?.date_label || '';
  el('#ownerField').value = data.meta?.owner || '';
  el('#phoneField').value = data.meta?.phone || '';
  el('#notes').value = data.meta?.notes || '';
  el('#materials').value = data.meta?.materials || '';
  updateProgress(data.progress || {percent:0,done:0,total:0});
  attachListDnD();
  applyFilters();
}
function updateProgress(p){
  el('#percentText').textContent = (p.percent || 0) + '%';
  el('#bar').style.width = (p.percent || 0) + '%';
  el('#progressField').value = `${p.done || 0} / ${p.total || 0} (${p.percent || 0}%)`;
}
async function refreshProgress(){
  try { const d = await API('bootstrap'); updateProgress(d.progress); }
  catch(e){ /* ignore */ }
}

/* ==== bindings ==== */
['#notes','#materials','#ownerField','#phoneField','#dateField'].forEach(sel=>{
  el(sel)?.addEventListener('change', async () => {
    try {
      await API('update_meta', {
        notes: el('#notes').value,
        materials: el('#materials').value,
        owner: el('#ownerField').value,
        phone: el('#phoneField').value,
        date_label: el('#dateField').value
      });
    } catch (err) { alert(err.message); }
  });
});

el('#addBtn')?.addEventListener('click', async () => {
  const title = el('#addTitle').value.trim();
  const description = el('#addDesc').value.trim();
  const priority = Number(el('#addPriority')?.value || 2);
  const tags = el('#addTags')?.value.trim() || '';
  const start_date = el('#addStart')?.value || '';
  const due_date = el('#addDue')?.value || '';
  if (!title) { alert('Συμπληρώστε τίτλο'); return; }
  try {
    const { task } = await API('add', { title, description, priority, tags, start_date, due_date });
    el('#taskList').appendChild(taskItem(task));
    el('#addTitle').value = '';
    el('#addDesc').value = '';
    if (el('#addTags')) el('#addTags').value = '';
    if (el('#addPriority')) el('#addPriority').value = '2';
    if (el('#addStart')) el('#addStart').value = '';
    if (el('#addDue')) el('#addDue').value = '';
    refreshProgress();
    applyFilters();
  } catch (err) { alert(err.message); }
});

  el('#printBtn')?.addEventListener('click', () => {
    const url = new URL('print.php', window.location.href);
    url.searchParams.set('list_id', LIST_ID);
    window.open(url.toString(), '_blank');
  });
el('#resetBtn')?.addEventListener('click', async () => {
  if (!confirm('Σίγουρα θέλετε να καθαρίσετε όλες τις επιλογές; (Η εργασία #4 θα παραμείνει ολοκληρωμένη)')) return;
  try { await API('reset', {}); await load(); } catch (err) { alert(err.message); }
});

/* ==== Filters ==== */
['#filterSearch','#filterTag','#filterPriority','#filterPending','#filterFrom','#filterTo','#sortDate'].forEach(sel=>{
  el(sel)?.addEventListener('input', applyFilters);
  el(sel)?.addEventListener('change', applyFilters);
});
function applyFilters(){
  const q  = (el('#filterSearch')?.value || '').toLowerCase();
  const tg = (el('#filterTag')?.value || '').toLowerCase();
  const pr = (el('#filterPriority')?.value || '');
  const onlyPending = !!el('#filterPending')?.checked;
  const from = el('#filterFrom')?.value || '';
  const to   = el('#filterTo')?.value || '';
  const sort = el('#sortDate')?.value || '';

  els('.task').forEach(li=>{
    const title = (li.querySelector('label')?.textContent || '').toLowerCase();
    const desc  = (li.querySelector('.desc')?.textContent || '').toLowerCase();
    const tags  = (li.dataset.tags || '');
    const prio  = (li.dataset.priority || '');
    const done  = li.querySelector('input[type="checkbox"]').checked;
    const due   = li.dataset.due_date || '';

    let ok = true;
    if (q && !(title.includes(q) || desc.includes(q))) ok = false;
    if (tg && !tags.split(',').map(s=>s.trim()).filter(Boolean).some(x => x.includes(tg))) ok = false;
    if (pr && pr !== prio) ok = false;
    if (onlyPending && done) ok = false;
    if (from && (!due || due < from)) ok = false;
    if (to && (!due || due > to)) ok = false;

    li.style.display = ok ? '' : 'none';
  });
  sortTasks(sort);
}

function sortTasks(order){
  const list = el('#taskList');
  const items = els('.task').filter(li => li.style.display !== 'none');
  const get = (li, key) => li.dataset[key] || '';
  items.sort((a,b)=>{
    switch(order){
      case 'start_asc': return get(a,'start_date').localeCompare(get(b,'start_date'));
      case 'start_desc': return get(b,'start_date').localeCompare(get(a,'start_date'));
      case 'due_asc': return get(a,'due_date').localeCompare(get(b,'due_date'));
      case 'due_desc': return get(b,'due_date').localeCompare(get(a,'due_date'));
      default: return 0;
    }
  });
  items.forEach(li => list.appendChild(li));
}

/* ==== Drag & Drop reorder ==== */
function attachListDnD(){
  const list = el('#taskList');
  list.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = el('.task.dragging');
    if (!dragging) return;
    const after = getDragAfterElement(list, e.clientY);
    if (after == null) list.appendChild(dragging);
    else list.insertBefore(dragging, after);
  });
}
function getDragAfterElement(container, y){
  const items = [...container.querySelectorAll('.task:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    else return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
async function sendOrder(){
  const items = els('.task');
  const ids = items.map(li => Number(li.dataset.id));
  const dates = {};
  items.forEach(li => {
    dates[li.dataset.id] = { start_date: li.dataset.start_date || null, due_date: li.dataset.due_date || null };
  });
  try { await API('reorder', { ids, dates }); }
  catch (err) { alert(err.message); }
}

/* ==== kick off ==== */
document.addEventListener('DOMContentLoaded', () => {
  load();
  const menuBtn = el('#menuBtn');
  const toolbar = el('.toolbar');
  if (menuBtn && toolbar) {
    menuBtn.addEventListener('click', () => {
      toolbar.classList.toggle('open');
    });
  }
});
