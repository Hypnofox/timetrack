const BASE = '/api';

export async function fetchEntries({ user, month, category } = {}) {
  const params = new URLSearchParams();
  if (user) params.set('user', user);
  if (month) params.set('month', month);
  if (category) params.set('category', category);
  const res = await fetch(`${BASE}/entries?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createEntry(data) {
  const res = await fetch(`${BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteEntry(id, user) {
  const res = await fetch(`${BASE}/entries/${id}?user=${encodeURIComponent(user)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchReportSummary({ user, month } = {}) {
  const params = new URLSearchParams();
  if (user) params.set('user', user);
  if (month) params.set('month', month);
  const res = await fetch(`${BASE}/report/summary?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
