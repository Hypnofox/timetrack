const BASE = '/api';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (res.status === 401) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function fetchMe() {
  const res = await fetch('/auth/me', { credentials: 'include' });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

// ── Entries ──────────────────────────────────────────────────────────────────
export async function fetchEntries({ user, month, category } = {}) {
  const p = new URLSearchParams();
  if (user) p.set('user', user);
  if (month) p.set('month', month);
  if (category) p.set('category', category);
  return apiFetch(`${BASE}/entries?${p}`);
}

export async function createEntry(data) {
  return apiFetch(`${BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteEntry(id, user) {
  return apiFetch(`${BASE}/entries/${id}?user=${encodeURIComponent(user)}`, { method: 'DELETE' });
}

export async function fetchReportSummary({ user, month } = {}) {
  const p = new URLSearchParams();
  if (user) p.set('user', user);
  if (month) p.set('month', month);
  return apiFetch(`${BASE}/report/summary?${p}`);
}

// ── Calendar ─────────────────────────────────────────────────────────────────
export async function fetchCalendarToday() {
  return apiFetch(`${BASE}/calendar/today`);
}
