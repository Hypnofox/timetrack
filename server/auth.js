const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('./db');

const VALID_USERS = ['Egor', 'Yonatan', 'Mariano', 'Ben'];

// Map Google emails to tracker usernames.
// Set USER_EMAIL_MAP env var: "egor@company.com:Egor,yonatan@company.com:Yonatan"
function buildEmailMap() {
  const raw = process.env.USER_EMAIL_MAP || '';
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(',')
      .map(pair => pair.trim().split(':'))
      .filter(parts => parts.length === 2)
      .map(([email, user]) => [email.trim().toLowerCase(), user.trim()])
  );
}

const EMAIL_MAP = buildEmailMap();

function emailToUser(email) {
  return EMAIL_MAP[email.toLowerCase()] || null;
}

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
    scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(null, false, { message: 'No email in Google profile' });

    const user = emailToUser(email);
    if (!user) {
      return done(null, false, { message: `Email ${email} is not mapped to a tracker user. Ask Egor to add you.` });
    }

    // Persist tokens so Calendar API can work after the OAuth redirect
    db.prepare(`
      INSERT INTO tokens (user, access_token, refresh_token, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user) DO UPDATE SET
        access_token  = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, tokens.refresh_token),
        updated_at    = excluded.updated_at
    `).run(user, accessToken, refreshToken || null);

    return done(null, { user, email });
  }
));

passport.serializeUser((userObj, done) => done(null, userObj.user));

passport.deserializeUser((username, done) => {
  if (!VALID_USERS.includes(username)) return done(null, false);
  done(null, { user: username });
});

module.exports = passport;
