import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '../constants';
import { createEntry } from '../api';
import { todayISO, formatSeconds, formatDuration } from '../utils';

export default function LogTime({ activeUser }) {
  const [mode, setMode] = useState('timer'); // 'timer' | 'manual'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3500);
  };
  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  return (
    <div className="log-time-page">
      <div className="page-header">
        <h2 className="page-title">Log Time</h2>
        <div className="mode-toggle">
          <button
            className={`mode-btn${mode === 'timer' ? ' mode-btn--active' : ''}`}
            onClick={() => setMode('timer')}
          >
            Live Timer
          </button>
          <button
            className={`mode-btn${mode === 'manual' ? ' mode-btn--active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {mode === 'timer' ? (
        <TimerMode activeUser={activeUser} onSuccess={showSuccess} onError={showError} />
      ) : (
        <ManualMode activeUser={activeUser} onSuccess={showSuccess} onError={showError} />
      )}
    </div>
  );
}

// ── Timer Mode ───────────────────────────────────────────────────────────────

function TimerMode({ activeUser, onSuccess, onError }) {
  const [category, setCategory] = useState('');
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null); // wall-clock anchor for drift-free timing
  const accumulatedRef = useRef(0);  // seconds accumulated before last pause

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const start = () => {
    if (!category) { onError('Please select a category first.'); return; }
    if (!customer.trim()) { onError('Please enter a customer / ticket name.'); return; }
    startTimeRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(accumulatedRef.current + elapsed);
    }, 500);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    accumulatedRef.current = seconds;
    setRunning(false);
  };

  const resume = () => {
    startTimeRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(accumulatedRef.current + elapsed);
    }, 500);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSeconds(0);
    accumulatedRef.current = 0;
  };

  const save = async () => {
    if (seconds < 30) { onError('Timer must run for at least 30 seconds.'); return; }
    const minutes = Math.max(1, Math.round(seconds / 60));
    setSaving(true);
    try {
      await createEntry({
        user: activeUser,
        category,
        customer: customer.trim(),
        notes: notes.trim(),
        minutes,
        date: todayISO(),
      });
      onSuccess(`Logged ${formatDuration(minutes)} for ${customer}`);
      reset();
      setCategory('');
      setCustomer('');
      setNotes('');
    } catch (e) {
      onError('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasStarted = seconds > 0 || running;

  return (
    <div className="card timer-card">
      <div className="timer-display">
        <span className={`timer-time mono${running ? ' timer-time--running' : ''}`}>
          {formatSeconds(seconds)}
        </span>
        {running && <span className="timer-pulse" />}
      </div>

      <div className="timer-form">
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={running}
          >
            <option value="">— Select category —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Customer / Ticket *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. ACME Corp, TKT-1234"
            value={customer}
            onChange={e => setCustomer(e.target.value)}
            disabled={running}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            placeholder="Optional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <div className="timer-controls">
        {!hasStarted && (
          <button className="btn btn-primary btn-lg" onClick={start}>
            ▶ Start
          </button>
        )}
        {hasStarted && running && (
          <button className="btn btn-warning btn-lg" onClick={pause}>
            ⏸ Pause
          </button>
        )}
        {hasStarted && !running && (
          <>
            <button className="btn btn-primary btn-lg" onClick={resume}>
              ▶ Resume
            </button>
            <button className="btn btn-success btn-lg" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              ✕ Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Manual Mode ──────────────────────────────────────────────────────────────

function ManualMode({ activeUser, onSuccess, onError }) {
  const [category, setCategory] = useState('');
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayISO());
  const [durationInput, setDurationInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const minutes = parseInt(durationInput, 10);
    if (!category) { onError('Please select a category.'); return; }
    if (!customer.trim()) { onError('Please enter a customer / ticket name.'); return; }
    if (!durationInput || isNaN(minutes) || minutes <= 0) {
      onError('Please enter a valid duration in minutes.');
      return;
    }
    if (!date) { onError('Please select a date.'); return; }

    setSubmitting(true);
    try {
      await createEntry({
        user: activeUser,
        category,
        customer: customer.trim(),
        notes: notes.trim(),
        minutes,
        date,
      });
      onSuccess(`Logged ${formatDuration(minutes)} for ${customer.trim()}`);
      setCategory('');
      setCustomer('');
      setNotes('');
      setDate(todayISO());
      setDurationInput('');
    } catch (e) {
      onError('Failed to save entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card manual-card">
      <form onSubmit={handleSubmit} className="manual-form">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">— Select category —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Customer / Ticket *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. ACME Corp, TKT-1234"
              value={customer}
              onChange={e => setCustomer(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Duration (minutes) *</label>
            <input
              className="form-input mono"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 45"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
            />
            {durationInput && !isNaN(parseInt(durationInput)) && parseInt(durationInput) > 0 && (
              <span className="form-hint mono">= {formatDuration(parseInt(durationInput))}</span>
            )}
          </div>

          <div className="form-group form-group--full">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Optional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Logging…' : '+ Log Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
