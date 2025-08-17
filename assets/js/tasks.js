import { el, els, API, LIST_ID } from './api.js';
import { applyFilters } from './filters.js';
import { initNotes } from './notes.js';
import { attachListDnD, sendOrder } from './dnd.js';

let BOOT = null;

function escapeHtml(s){ return (s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(s){ return (s||'').replace(/"/g, '&quot;'); }
const fmtDate = d => new Date(d).toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit' });

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
function renderDates(start, due){
  if (start && due) return `<div class="dates">📅 <span class="start">${escapeHtml(fmtDate(start))}</span> → <span class="due">${escapeHtml(fmtDate(due))}</span></div>`;
  if (start)       return `<div class="dates">📅 Από <span class="start">${escapeHtml(fmtDate(start))}</span></div>`;
  if (due)         return `<div class="dates">📅 Μέχρι <span class="due">${escapeHtml(fmtDate(due))}</span></div>`;
  return '';
}

export function taskItem(t){
  const li = document.createElement('li');
  li.className = 'task';
  li.dataset.id = t.id;
  li.dataset.priority = t.priority || 2;
  li.dataset.tags = (t.tags || '').toLowerCase();
  li.dataset.start_date = t.start_date || '';
  li.dataset.due_date   = t.due_date   || '';
  li.draggable = true;
  if (t.checked) li.classList.add('done');

  const datesLine = renderDates(t.start_date, t.due_date);

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

      <details class="taskNotes">
        <summary class="noteSummary">Σημειώσεις</summary>
        <div class="addNote">
          <input class="noteText" placeholder="Νέα σημείωση… (Enter για αποθήκευση)">
          <button class="noteAddBtn" title="Προσθήκη">➕</button>
        </div>
        <div class="notesThread" data-loaded="0"></div>
      </details>

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
            <input class="editStart" type="date" value="${escapeAttr(t.start_date || '')}" placeholder="Από" title="Ημερομηνία αρχής">
            <input class="editDue" type="date"   value="${escapeAttr(t.due_date   || '')}" placeholder="Μέχρι" title="Ημερομηνία λήξης">
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
  el('input[type="checkbox"]', li).addEventListener('change', async e => {
    try {
      await API('toggle', { id: t.id, checked: e.target.checked });
      li.classList.toggle('done', e.target.checked);
      refreshProgress();
    } catch (err) { alert(err.message); e.target.checked = !e.target.checked; }
  });

  el('.del', li).addEventListener('click', async () => {
    if (!confirm('Διαγραφή εργασίας;')) return;
    try { await API('delete', { id: t.id }); li.remove(); refreshProgress(); }
    catch (err) { alert(err.message); }
  });

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
    const due_date   = el('.editDue', li).value;
    try {
      await API('update_task', { id: t.id, title, description, tags, priority, start_date, due_date });
      el('.titleText', li).textContent = title;
      el('.desc', li).textContent = description;
      li.dataset.priority   = String(priority);
      li.dataset.tags       = tags.toLowerCase();
      li.dataset.start_date = start_date || '';
      li.dataset.due_date   = due_date   || '';
      const oldBadge = el('.titleRow .badge', li); if (oldBadge) oldBadge.remove();
      el('.titleRow', li).insertAdjacentElement('beforeend', prioBadge(priority));
      const oldChips = el('.chips', li); if (oldChips) oldChips.remove();
      el('.desc', li).insertAdjacentHTML('afterend', renderChips(tags));
      const oldDates = el('.dates', li); if (oldDates) oldDates.remove();
      const datesLine = renderDates(start_date, due_date);
      el('.desc', li).insertAdjacentHTML('afterend', datesLine);
      el('.cancelEdit', li).click();
      applyFilters();
    } catch (err) { alert(err.message); }
  });

  initNotes(li, t);

  li.addEventListener('dragstart', e => { li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  li.addEventListener('dragend',   async () => { li.classList.remove('dragging'); await sendOrder(); });

  return li;
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

export async function load(){
  try {
    const data = await API('bootstrap'); BOOT = data; render(data);
  } catch (err) {
    if (BOOT) render(BOOT);
    else alert('Αποτυχία φόρτωσης: ' + err.message);
  }
}

function updateProgress(p){
  el('#percentText').textContent = (p.percent || 0) + '%';
  el('#bar').style.width = (p.percent || 0) + '%';
  el('#progressField').value = `${p.done || 0} / ${p.total || 0} (${p.percent || 0}%)`;
}

export async function refreshProgress(){
  try { const d = await API('bootstrap'); updateProgress(d.progress); }
  catch(e){ /* ignore */ }
}

export function init(){
  load();
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
    const due_date   = el('#addDue')?.value || '';
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

  const menuBtn = el('#menuBtn');
  const toolbar = el('.toolbar');
  if (menuBtn && toolbar) {
    menuBtn.addEventListener('click', () => {
      toolbar.classList.toggle('open');
    });
  }

  el('#printBtn')?.addEventListener('click', () => {
    window.open(`print.php?list_id=${LIST_ID}`, '_blank');
  });

  el('#exportBtn')?.addEventListener('click', async () => {
    try {
      const data = await API('bootstrap');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'checklist.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
  });

  el('#resetBtn')?.addEventListener('click', () => {
    const modal = el('#confirmModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const hide = () => modal.classList.add('hidden');
    el('#confirmNo', modal).onclick = hide;
    el('#confirmYes', modal).onclick = async () => {
      try { await API('wipe'); load(); }
      catch (err) { alert(err.message); }
      hide();
    };
  });

}
