const API_BASE = 'http://localhost:3001/api';

function getToken() { return localStorage.getItem('tm_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('tm_user')); } catch { return null; } }
function setAuth(token, user) { localStorage.setItem('tm_token', token); localStorage.setItem('tm_user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('tm_token'); localStorage.removeItem('tm_user'); }
function requireAuth() { if (!getToken()) { window.location.href = '/index.html'; return false; } return true; }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const API = {
  auth: {
    login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    signup: (body) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    me: () => apiFetch('/auth/me'),
  },
  projects: {
    list: () => apiFetch('/projects'),
    get: (id) => apiFetch(`/projects/${id}`),
    create: (body) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
    addMember: (id, userId) => apiFetch(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeMember: (id, userId) => apiFetch(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (projectId) => apiFetch(projectId ? `/tasks?projectId=${projectId}` : '/tasks'),
    my: () => apiFetch('/tasks/my'),
    create: (body) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => apiFetch('/users'),
    updateRole: (id, role) => apiFetch(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    stats: () => apiFetch('/dashboard/stats'),
  },
};

function showToast(msg, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const icons = { success:'OK', error:'ERR', info:'INFO' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'INFO'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
}

function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('active'); });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay')?.classList.remove('active'));
  });
}

function avatar(name, color, cls = '') {
  const initials = (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  return `<div class="avatar ${cls}" style="background:${color||'#6366f1'}">${initials}</div>`;
}

function badge(text, type) {
  const map = { todo:'todo', in_progress:'in_progress', review:'review', done:'done', active:'active', completed:'completed', archived:'archived', low:'low', medium:'medium', high:'high', urgent:'urgent', admin:'admin', member:'member' };
  const cls = map[text] || 'medium';
  const labels = { in_progress:'In Progress' };
  return `<span class="badge badge-${cls}">${labels[text]||text}</span>`;
}

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toISOString().split('T')[0]);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function progress(done, total) {
  const pct = total ? Math.round((done/total)*100) : 0;
  return `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><span class="text-xs text-muted">${pct}%</span>`;
}
