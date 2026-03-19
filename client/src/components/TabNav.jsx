import React from 'react';

const TABS = [
  { id: 'log',     label: 'Log Time' },
  { id: 'entries', label: 'Entries' },
  { id: 'report',  label: 'Report' },
];

export default function TabNav({ activeTab, onTabChange }) {
  return (
    <nav className="tab-nav">
      <div className="tab-nav-inner">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
