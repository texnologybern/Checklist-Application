import { el, els, API } from './api.js';

export function attachListDnD(){
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

export function getDragAfterElement(container, y){
  const items = [...container.querySelectorAll('.task:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    else return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export async function sendOrder(){
  const items = els('.task');
  const ids = items.map(li => Number(li.dataset.id));
  const dates = {};
  items.forEach(li => {
    dates[li.dataset.id] = { start_date: li.dataset.start_date || null, due_date: li.dataset.due_date || null };
  });
  try { await API('reorder', { ids, dates }); }
  catch (err) { alert(err.message); }
}
