import React, { useState } from 'react';
import UserSelector from './components/UserSelector';
import TabNav from './components/TabNav';
import LogTime from './components/LogTime';
import Entries from './components/Entries';
import Report from './components/Report';
import { ADMIN_USER } from './constants';

export default function App() {
  const [activeUser, setActiveUser] = useState(null);
  const [activeTab, setActiveTab] = useState('log');

  const isAdmin = activeUser === ADMIN_USER;

  if (!activeUser) {
    return <UserSelector onSelect={setActiveUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-logo">⏱</span>
          <span className="brand-name">Faddom Time Tracker</span>
        </div>
        <div className="header-user">
          <span className="user-label">Logged in as</span>
          <span className="user-name">{activeUser}</span>
          {isAdmin && <span className="admin-badge">ADMIN</span>}
          <button className="btn-ghost btn-sm" onClick={() => setActiveUser(null)}>
            Switch User
          </button>
        </div>
      </header>

      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="app-main">
        {activeTab === 'log' && (
          <LogTime activeUser={activeUser} isAdmin={isAdmin} />
        )}
        {activeTab === 'entries' && (
          <Entries activeUser={activeUser} isAdmin={isAdmin} />
        )}
        {activeTab === 'report' && (
          <Report activeUser={activeUser} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}
