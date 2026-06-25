import React from 'react';

export default function LoginScreen({ authError }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f1117', padding: '2rem',
    }}>
      <div style={{
        background: '#1a1d27', border: '1px solid #2e3348', borderRadius: '12px',
        padding: '2.5rem 2rem', width: '100%', maxWidth: '380px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏱</div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#e2e8f0', marginBottom: '.5rem' }}>
          Faddom Support Tracker
        </h1>
        <p style={{ color: '#6b7594', marginBottom: '2rem', fontSize: '13px' }}>
          Sign in with your Faddom Google account
        </p>

        {authError && (
          <div style={{
            background: 'rgba(247,79,122,.1)', border: '1px solid rgba(247,79,122,.3)',
            color: '#f74f7a', borderRadius: '8px', padding: '10px 14px',
            marginBottom: '1.5rem', fontSize: '13px',
          }}>
            Your Google account is not mapped to a tracker user. Ask Egor to add you.
          </div>
        )}

        <a
          href="/auth/google"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: 'white', color: '#2c2c2a', borderRadius: '8px',
            padding: '11px 20px', textDecoration: 'none', fontWeight: 600, fontSize: '15px',
            border: '1px solid #e0e0e0',
          }}
        >
          <GoogleIcon />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
