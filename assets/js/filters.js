import { el, els } from './api.js';

function sortTasks(order){
  const list = el('#taskList');
  const items = els('.task').filter(li => li.style.display !== 'none');
  const get = (li, key) => li.dataset[key] || '';
  items.sort((a, b) => {
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

export function applyFilters(){
  const q  = (el('#filterSearch')?.value || '').toLowerCase();
  const tg = (el('#filterTag')?.value || '').toLowerCase();
  const pr = (el('#filterPriority')?.value || '');
  const onlyPending = !!el('#filterPending')?.checked;
  const from = el('#filterFrom')?.value || '';
  const to   = el('#filterTo')?.value || '';
  const sort = el('#sortDate')?.value || '';

  els('.task').forEach(li => {
    const title = (li.querySelector('label')?.textContent || '').toLowerCase();
    const desc  = (li.querySelector('.desc')?.textContent || '').toLowerCase();
    const tags  = (li.dataset.tags || '');
    const prio  = (li.dataset.priority || '');
    const done  = li.querySelector('input[type="checkbox"]').checked;
    const start = li.dataset.start_date || '';
    const due   = li.dataset.due_date || '';

    let ok = true;
    if (q && !(title.includes(q) || desc.includes(q))) ok = false;
    if (tg && !tags.split(',').map(s=>s.trim()).filter(Boolean).some(x => x.includes(tg))) ok = false;
    if (pr && pr !== prio) ok = false;
    if (onlyPending && done) ok = false;

    if (from || to){
      const inRange = d => (!from || d >= from) && (!to || d <= to);
      const hasStart = !!start, hasDue = !!due;
      const startOk = hasStart && inRange(start);
      const dueOk   = hasDue && inRange(due);
      const rangeOk = hasStart && hasDue && (!from || due >= from) && (!to || start <= to);
      if (!(startOk || dueOk || rangeOk)) ok = false;
    }

    li.style.display = ok ? '' : 'none';
  });
  sortTasks(sort);
}

['#filterSearch','#filterTag','#filterPriority','#filterPending','#filterFrom','#filterTo','#sortDate'].forEach(sel=>{
  el(sel)?.addEventListener('input', applyFilters);
  el(sel)?.addEventListener('change', applyFilters);
});
