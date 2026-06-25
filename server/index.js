const express  = require('express');
const cors     = require('cors');
const session  = require('express-session');
const passport = require('./auth');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ─────────────────────────────────────────────────────────────────────
// In dev the Vite proxy handles this; in production FRONTEND_ORIGIN must be set.
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json());

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'change-me-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000, // 1 week
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Auth routes (not under /api) ──────────────────────────────────────────────
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/?auth_error=1',
    failureMessage: true,
  }),
  (req, res) => {
    const clientBase = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    res.redirect(clientBase);
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    const clientBase = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    res.redirect(clientBase);
  });
});

app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user.user });
});

// ── API routes ────────────────────────────────────────────────────────────────
const apiRoutes      = require('./routes');
const calendarRoutes = require('./calendar');

app.use('/api', apiRoutes);
app.use('/api/calendar', calendarRoutes);

// ── Serve built frontend ──────────────────────────────────────────────────────
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Faddom Time Tracker server → http://localhost:${PORT}`);
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('⚠  GOOGLE_CLIENT_ID not set — Google auth will not work');
  }
  if (!process.env.USER_EMAIL_MAP) {
    console.warn('⚠  USER_EMAIL_MAP not set — no emails are mapped to tracker users');
  }
});
