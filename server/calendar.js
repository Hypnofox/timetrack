const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const db = require('./db');

function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function getOAuthClient(user) {
  const row = db.prepare('SELECT access_token, refresh_token FROM tokens WHERE user = ?').get(user);
  if (!row) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
  );

  client.setCredentials({
    access_token:  row.access_token,
    refresh_token: row.refresh_token,
  });

  // Persist refreshed access tokens automatically
  client.on('tokens', tokens => {
    if (tokens.access_token) {
      db.prepare(`UPDATE tokens SET access_token = ?, updated_at = datetime('now') WHERE user = ?`)
        .run(tokens.access_token, user);
    }
  });

  return client;
}

// Guess a tracker category from a calendar event title
function guessCategory(title) {
  const t = (title || '').toLowerCase();
  if (/standup|sync|1:1|all.?hands|team|internal|retrospective|planning|sprint/i.test(t)) return 'Internal Meeting';
  if (/call|demo|onboarding|customer|client|pilot|poc|webinar/i.test(t)) return 'Customer Call / Demo';
  return 'Internal Meeting';
}

// GET /api/calendar/today — fetch today's events for the logged-in user
router.get('/today', requireAuth, async (req, res) => {
  try {
    const auth = getOAuthClient(req.user.user);
    if (!auth) {
      return res.status(400).json({ error: 'No calendar token — please sign out and sign in again to grant calendar access.' });
    }

    const cal = google.calendar({ version: 'v3', auth });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await cal.events.list({
      calendarId: 'primary',
      timeMin:     today.toISOString(),
      timeMax:     tomorrow.toISOString(),
      singleEvents: true,
      orderBy:     'startTime',
    });

    const events = (data.items || [])
      .filter(e => e.start?.dateTime && e.status !== 'cancelled')
      .map(e => {
        const start   = new Date(e.start.dateTime);
        const end     = new Date(e.end.dateTime);
        const minutes = Math.max(1, Math.round((end - start) / 60000));
        return {
          calId:           e.id,
          title:           e.summary || 'Untitled event',
          start:           e.start.dateTime,
          end:             e.end.dateTime,
          minutes,
          suggestedCategory: guessCategory(e.summary),
          attendees:       (e.attendees || []).map(a => a.email),
        };
      });

    res.json(events);
  } catch (err) {
    console.error('Calendar API error:', err.message);
    if (err.code === 401) {
      return res.status(401).json({ error: 'Calendar token expired — please sign out and sign in again.' });
    }
    res.status(500).json({ error: 'Failed to fetch calendar events.' });
  }
});

module.exports = router;
