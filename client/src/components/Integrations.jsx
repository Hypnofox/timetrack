import React, { useState, useEffect } from 'react';

const SOURCES = [
  {
    id: 'intercom',
    name: 'Intercom',
    color: '#4f8ef7',
    description: 'Auto-log closed support tickets with handle time.',
    field: '/api/webhook/intercom',
    payload: `{
  "user": "Egor",
  "ticket_id": "12345",
  "subject": "API not working",
  "customer": "Acme Corp",
  "closed_at": "2024-01-15T14:30:00Z",
  "handle_time_minutes": 45
}`,
    makeSteps: [
      'Create a Make.com scenario with an Intercom "Watch Conversations" trigger.',
      'Filter: status = closed.',
      'Add an HTTP module → POST to the webhook URL above.',
      'Map: user (assign based on assignee email), ticket_id, subject, customer name, closed_at, handle_time_minutes (from conversation duration or a custom attribute).',
    ],
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    color: '#4fde8a',
    description: 'Auto-log customer call durations from calendar events.',
    field: '/api/webhook/gcal',
    payload: `{
  "user": "Yonatan",
  "event_title": "Onboarding Call - Beta Inc",
  "customer": "Beta Inc",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T11:00:00Z"
}`,
    makeSteps: [
      'Create a Make.com scenario with a Google Calendar "Watch Events" trigger.',
      'Filter: calendar = "Support Calls", event ends (past events).',
      'Add an HTTP module → POST to the webhook URL above.',
      'Map: user (from organizer or a fixed value), event_title, customer (parse from title or description), start_time, end_time.',
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    color: '#a04ff7',
    description: 'Auto-log task completions with estimated time from Notion database.',
    field: '/api/webhook/notion',
    payload: `{
  "user": "Mariano",
  "task_name": "Write migration guide for v3",
  "customer": "Internal",
  "category": "Documentation / KB",
  "estimated_minutes": 90,
  "completed_date": "2024-01-15"
}`,
    makeSteps: [
      'Create a Make.com scenario with a Notion "Watch Database Items" trigger.',
      'Filter: Status property changed to "Done".',
      'Add an HTTP module → POST to the webhook URL above.',
      'Map: user (from Assignee property), task_name (from Name), customer, category, estimated_minutes (from a "Time Est." number property), completed_date.',
    ],
  },
];

export default function Integrations({ isAdmin }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetch('/api/webhook/info')
      .then(r => r.json())
      .then(data => setWebhookInfo(data))
      .catch(() => {});
  }, []);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const webhookUrl = (path) => `${baseUrl}${path}`;
  const authNote = webhookInfo?.auth || 'Loading…';

  return (
    <div className="integrations-page">
      <div className="page-header">
        <h2 className="page-title">Integrations</h2>
      </div>

      <div className="integrations-intro">
        <p>
          Connect external tools to auto-populate time entries — no manual logging needed.
          Each integration posts data to a webhook endpoint on this server.
          You can use <strong>Make.com</strong> (formerly Integromat) as a relay, or call the
          webhooks directly from any automation tool.
        </p>
        <div className="auth-notice">
          <span className="auth-label">Auth status:</span>
          <span className="mono" style={{ color: webhookInfo?.auth?.startsWith('No secret') ? '#f7c94f' : '#4fde8a' }}>
            {authNote}
          </span>
        </div>
      </div>

      <div className="integration-cards">
        {SOURCES.map(src => {
          const url = webhookUrl(src.field);
          const isOpen = expanded === src.id;
          return (
            <div key={src.id} className="integration-card">
              <div
                className="integration-card-header"
                onClick={() => setExpanded(isOpen ? null : src.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="integration-card-title">
                  <span
                    className="integration-dot"
                    style={{ background: src.color }}
                  />
                  <span style={{ color: src.color, fontWeight: 600 }}>{src.name}</span>
                </div>
                <span className="muted" style={{ fontSize: '13px' }}>{src.description}</span>
                <span className="integration-chevron">{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div className="integration-card-body">
                  <div className="webhook-url-row">
                    <span className="mono webhook-url">{url}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copy(url, src.id + '-url')}
                    >
                      {copied === src.id + '-url' ? '✓ Copied' : 'Copy URL'}
                    </button>
                  </div>

                  <div className="integration-section">
                    <div className="integration-section-label">Method</div>
                    <span className="mono" style={{ color: '#4fde8a' }}>POST</span>
                    {' '}<span className="mono muted">· Content-Type: application/json</span>
                    {webhookInfo?.auth && !webhookInfo.auth.startsWith('No secret') && (
                      <span className="mono muted"> · x-webhook-secret: ••••</span>
                    )}
                  </div>

                  <div className="integration-section">
                    <div className="integration-section-label">Example payload</div>
                    <div className="code-block-wrapper">
                      <pre className="code-block mono">{src.payload}</pre>
                      <button
                        className="btn btn-ghost btn-sm code-copy-btn"
                        onClick={() => copy(src.payload, src.id + '-payload')}
                      >
                        {copied === src.id + '-payload' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="integration-section">
                    <div className="integration-section-label">Make.com setup</div>
                    <ol className="make-steps">
                      {src.makeSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bulk-import-section">
        <h3 className="section-title">Bulk Import</h3>
        <p className="muted" style={{ marginBottom: '12px' }}>
          Import multiple entries at once — useful for historical data or CSV migrations.
        </p>
        <div className="webhook-url-row">
          <span className="mono webhook-url">{webhookUrl('/api/entries/bulk')}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => copy(webhookUrl('/api/entries/bulk'), 'bulk-url')}
          >
            {copied === 'bulk-url' ? '✓ Copied' : 'Copy URL'}
          </button>
        </div>
        <pre className="code-block mono" style={{ marginTop: '12px' }}>{`POST /api/entries/bulk
x-webhook-secret: <secret>

{
  "entries": [
    {
      "user": "Egor",
      "category": "Intercom Ticket",
      "customer": "Acme Corp",
      "notes": "Resolved SSL issue",
      "minutes": 35,
      "date": "2024-01-15",
      "source": "intercom"
    }
  ]
}

// Response: { "imported": 1, "errors": [] }`}</pre>
      </div>

      <div className="integrations-footer">
        <p className="muted" style={{ fontSize: '13px' }}>
          To secure webhooks, set the <span className="mono">WEBHOOK_SECRET</span> environment
          variable on the server and include it as the{' '}
          <span className="mono">x-webhook-secret</span> header in all requests.
        </p>
      </div>
    </div>
  );
}
