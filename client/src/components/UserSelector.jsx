import React, { useState } from 'react';
import { USERS, ADMIN_USER } from '../constants';

export default function UserSelector({ onSelect }) {
  const [selected, setSelected] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected) onSelect(selected);
  };

  return (
    <div className="user-selector-screen">
      <div className="user-selector-card">
        <div className="user-selector-logo">⏱</div>
        <h1 className="user-selector-title">Faddom Support<br />Time Tracker</h1>
        <p className="user-selector-subtitle">Select your name to continue</p>
        <form onSubmit={handleSubmit} className="user-selector-form">
          <div className="form-group">
            <label className="form-label" htmlFor="user-select">Who are you?</label>
            <select
              id="user-select"
              className="form-select"
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">— Select your name —</option>
              {USERS.map(u => (
                <option key={u} value={u}>{u}{u === ADMIN_USER ? ' (Admin)' : ''}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!selected}
          >
            Start Tracking
          </button>
        </form>
      </div>
    </div>
  );
}
