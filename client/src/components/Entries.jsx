import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, USERS, ADMIN_USER } from '../constants';
import { fetchEntries, deleteEntry } from '../api';
import { formatDuration, currentMonthISO, exportCSV } from '../utils';
import CategoryBadge from './CategoryBadge';

const SOURCE_META = {
  manual:  { label: 'Manual',   color: '#6b7594' },
  intercom:{ label: 'Intercom', color: '#4f8ef7' },
  gcal:    { label: 'GCal',     color: '#4fde8a' },
  notion:  { label: 'Notion',   color: '#a04ff7' },
};

function SourceBadge({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.manual;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: 'var(--font-mono)',
      background: meta.color + '22',
      color: meta.color,
      border: `1px solid ${meta.color}44`,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

export default function Entries({ activeUser, isAdmin }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(currentMonthISO());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEntries({ user: activeUser, month, category: categoryFilter });
      setEntries(data);
    } catch (e) {
      setError('Failed to load entries.');
    } finally {
      setLoading(false);
    }
  }, [activeUser, month, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this entry (${entry.customer}, ${formatDuration(entry.minutes)})?`)) return;
    setDeletingId(entry.id);
    try {
      await deleteEntry(entry.id, activeUser);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (e) {
      alert('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (entry) => isAdmin || entry.user === activeUser;

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="entries-page">
      <div className="page-header">
        <h2 className="page-title">Entries</h2>
        <div className="entries-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => exportCSV(entries, `entries-${month}.csv`)}
            disabled={entries.length === 0}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Month</label>
          <input
            className="form-input filter-input"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select
            className="form-select filter-input"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-meta mono">
          {loading ? 'Loading…' : `${entries.length} entries · ${formatDuration(totalMinutes)} total`}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              {isAdmin && <th>User</th>}
              <th>Category</th>
              <th>Customer / Ticket</th>
              <th>Notes</th>
              <th className="col-duration">Duration</th>
              <th>Source</th>
              <th className="col-action"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="table-empty">
                  No entries found for this period.
                </td>
              </tr>
            )}
            {entries.map(entry => (
              <tr key={entry.id} className="entry-row">
                <td className="mono">{entry.date}</td>
                {isAdmin && <td>{entry.user}</td>}
                <td><CategoryBadge category={entry.category} /></td>
                <td className="cell-customer">{entry.customer}</td>
                <td className="cell-notes">{entry.notes || <span className="muted">—</span>}</td>
                <td className="mono col-duration">{formatDuration(entry.minutes)}</td>
                <td><SourceBadge source={entry.source || 'manual'} /></td>
                <td className="col-action">
                  {canDelete(entry) && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(entry)}
                      disabled={deletingId === entry.id}
                      title="Delete entry"
                    >
                      {deletingId === entry.id ? '…' : '✕'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
