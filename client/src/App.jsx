import React, { useState, useEffect } from 'react';
import LoginScreen from './components/UserSelector';
import TabNav from './components/TabNav';
import LogTime from './components/LogTime';
import Entries from './components/Entries';
import Report from './components/Report';
import Integrations from './components/Integrations';
import { fetchMe } from './api';
import { ADMIN_USER } from './constants';

export default function App() {
  const [authState, setAuthState] = useState(null); // null = loading
  const authError = new URLSearchParams(window.location.search).get('auth_error') === '1';
  const [activeTab, setActiveTab] = useState('log');

  useEffect(() => {
    fetchMe().then(data => {
      setAuthState(data.authenticated ? data : { authenticated: false });
    });
  }, []);

  if (authState === null) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f1117', color: '#6b7594', fontSize: '14px',
      }}>
        Loading…
      </div>
    );
  }

  if (!authState.authenticated) {
    return <LoginScreen authError={authError} />;
  }

  const activeUser = authState.user;
  const isAdmin = activeUser === ADMIN_USER;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-logo">⏱</span>
          <span className="brand-name">Faddom Time Tracker</span>
        </div>
        <div className="header-user">
          <span className="user-label">Signed in as</span>
          <span className="user-name">{activeUser}</span>
          {isAdmin && <span className="admin-badge">ADMIN</span>}
          <a className="btn-ghost btn-sm" href="/auth/logout" style={{ textDecoration: 'none' }}>
            Sign out
          </a>
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
        {activeTab === 'integrations' && (
          <Integrations isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}
