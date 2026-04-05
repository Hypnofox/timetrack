const express = require('express');
const router = express.Router();
const db = require('./db');

const ADMIN_USER = 'Egor';
const VALID_USERS = ['Egor', 'Yonatan', 'Mariano', 'Ben'];
const VALID_CATEGORIES = [
  'Intercom Ticket',
  'Debug / Lab Repro',
  'Customer Call / Demo',
  'Internal Meeting',
  'Documentation / KB',
  'Email / Async Comms',
  'Escalation to Dev',
];
const VALID_SOURCES = ['manual', 'intercom', 'gcal', 'notion'];

// Webhook secret — set WEBHOOK_SECRET env var to secure the endpoints
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || null;

function verifyWebhookSecret(req, res) {
  if (!WEBHOOK_SECRET) return true; // no secret configured = open
  const provided = req.headers['x-webhook-secret'] || req.query.secret;
  if (provided !== WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Invalid webhook secret' });
    return false;
  }
  return true;
}

function insertEntry({ user, category, customer, notes, minutes, date, source }) {
  const stmt = db.prepare(`
    INSERT INTO entries (user, category, customer, notes, minutes, date, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(user, category, customer.trim(), notes || '', minutes, date, source);
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
}

// GET /api/entries
router.get('/entries', (req, res) => {
  const { user, month, category } = req.query;

  if (!user || !VALID_USERS.includes(user)) {
    return res.status(400).json({ error: 'Invalid or missing user' });
  }

  let query = 'SELECT * FROM entries WHERE 1=1';
  const params = [];

  // Non-admin can only see their own entries
  if (user !== ADMIN_USER) {
    query += ' AND user = ?';
    params.push(user);
  }

  if (month) {
    // month format: YYYY-MM
    query += " AND strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  if (category && VALID_CATEGORIES.includes(category)) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  try {
    const entries = db.prepare(query).all(...params);
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/entries
router.post('/entries', (req, res) => {
  const { user, category, customer, notes, minutes, date } = req.body;

  if (!user || !VALID_USERS.includes(user)) {
    return res.status(400).json({ error: 'Invalid or missing user' });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid or missing category' });
  }
  if (!customer || typeof customer !== 'string' || customer.trim() === '') {
    return res.status(400).json({ error: 'Customer/ticket name is required' });
  }
  if (!minutes || typeof minutes !== 'number' || minutes <= 0 || !Number.isInteger(minutes)) {
    return res.status(400).json({ error: 'Minutes must be a positive integer' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }

  try {
    const entry = insertEntry({ user, category, customer, notes, minutes, date, source: 'manual' });
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/entries/:id
router.delete('/entries/:id', (req, res) => {
  const { id } = req.params;
  const { user } = req.query;

  if (!user || !VALID_USERS.includes(user)) {
    return res.status(400).json({ error: 'Invalid or missing user' });
  }

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // Only owner or admin can delete
  if (entry.user !== user && user !== ADMIN_USER) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/report/summary
router.get('/report/summary', (req, res) => {
  const { user, month } = req.query;

  if (!user || !VALID_USERS.includes(user)) {
    return res.status(400).json({ error: 'Invalid or missing user' });
  }

  // For non-admin, force filter to their own data
  const isAdmin = user === ADMIN_USER;

  // Build base WHERE conditions
  const buildConditions = (filterUser) => {
    const conditions = [];
    const params = [];
    if (filterUser) {
      conditions.push('user = ?');
      params.push(filterUser);
    }
    if (month) {
      conditions.push("strftime('%Y-%m', date) = ?");
      params.push(month);
    }
    return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
  };

  const targetUser = isAdmin ? null : user;
  const { where, params } = buildConditions(targetUser);

  try {
    // Hours by category
    const byCategory = db.prepare(`
      SELECT category, ROUND(SUM(minutes) / 60.0, 2) as hours
      FROM entries ${where}
      GROUP BY category
      ORDER BY hours DESC
    `).all(...params);

    // Hours by team member (admin only)
    const byUser = isAdmin ? db.prepare(`
      SELECT user, ROUND(SUM(minutes) / 60.0, 2) as hours
      FROM entries ${where}
      GROUP BY user
      ORDER BY hours DESC
    `).all(...params) : [];

    // Hours by customer (top 8)
    const byCustomer = db.prepare(`
      SELECT customer, ROUND(SUM(minutes) / 60.0, 2) as hours
      FROM entries ${where}
      GROUP BY customer
      ORDER BY hours DESC
      LIMIT 8
    `).all(...params);

    // Weekly trend (last 10 weeks)
    // Get the Monday of each of the last 10 weeks
    const weeklyTrend = db.prepare(`
      SELECT
        strftime('%Y-%W', date) as week_key,
        date(date, 'weekday 1', '-7 days') as week_start,
        ROUND(SUM(minutes) / 60.0, 2) as hours
      FROM entries ${where}
      GROUP BY week_key
      ORDER BY week_key DESC
      LIMIT 10
    `).all(...params).reverse();

    // Total minutes
    const totalsRow = db.prepare(`
      SELECT
        SUM(minutes) as total_minutes,
        COUNT(DISTINCT date) as active_days
      FROM entries ${where}
    `).get(...params);

    // Top category
    const topCategoryRow = byCategory.length > 0 ? byCategory[0] : null;

    res.json({
      byCategory,
      byUser,
      byCustomer,
      weeklyTrend,
      totals: {
        totalMinutes: totalsRow?.total_minutes || 0,
        activeDays: totalsRow?.active_days || 0,
        topCategory: topCategoryRow?.category || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/users
router.get('/users', (req, res) => {
  res.json(VALID_USERS);
});

// GET /api/categories
router.get('/categories', (req, res) => {
  res.json(VALID_CATEGORIES);
});

// ---------------------------------------------------------------------------
// WEBHOOKS — receive data from Intercom, Google Calendar, Notion (or Make.com)
// ---------------------------------------------------------------------------

// POST /api/webhook/intercom
// Expected payload (from Make.com or direct Intercom webhook):
// { user, ticket_id, subject, customer, closed_at, handle_time_minutes }
router.post('/webhook/intercom', (req, res) => {
  if (!verifyWebhookSecret(req, res)) return;

  try {
    const { user, ticket_id, subject, customer, closed_at, handle_time_minutes } = req.body;

    if (!user || !VALID_USERS.includes(user)) {
      return res.status(400).json({ error: 'Invalid or missing user' });
    }
    const minutes = Math.round(Number(handle_time_minutes));
    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'handle_time_minutes must be a positive number' });
    }
    const rawDate = closed_at ? new Date(closed_at) : new Date();
    const date = rawDate.toISOString().slice(0, 10);
    const customerName = (customer || ticket_id || 'Unknown').toString().trim();
    const notes = subject ? `Ticket: ${subject}` : (ticket_id ? `#${ticket_id}` : '');

    const entry = insertEntry({
      user, category: 'Intercom Ticket', customer: customerName,
      notes, minutes, date, source: 'intercom',
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error('Intercom webhook error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/webhook/gcal
// Expected payload (from Make.com Google Calendar trigger):
// { user, event_title, customer, start_time, end_time }
router.post('/webhook/gcal', (req, res) => {
  if (!verifyWebhookSecret(req, res)) return;

  try {
    const { user, event_title, customer, start_time, end_time } = req.body;

    if (!user || !VALID_USERS.includes(user)) {
      return res.status(400).json({ error: 'Invalid or missing user' });
    }
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }
    const start = new Date(start_time);
    const end = new Date(end_time);
    const minutes = Math.round((end - start) / 60000);
    if (minutes <= 0) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }
    const date = start.toISOString().slice(0, 10);
    const customerName = (customer || event_title || 'Unknown').toString().trim();

    const entry = insertEntry({
      user, category: 'Customer Call / Demo', customer: customerName,
      notes: event_title || '', minutes, date, source: 'gcal',
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error('GCal webhook error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/webhook/notion
// Expected payload (from Make.com Notion trigger):
// { user, task_name, customer, category, estimated_minutes, completed_date }
router.post('/webhook/notion', (req, res) => {
  if (!verifyWebhookSecret(req, res)) return;

  try {
    const { user, task_name, customer, category, estimated_minutes, completed_date } = req.body;

    if (!user || !VALID_USERS.includes(user)) {
      return res.status(400).json({ error: 'Invalid or missing user' });
    }
    const resolvedCategory = VALID_CATEGORIES.includes(category) ? category : 'Documentation / KB';
    const minutes = Math.round(Number(estimated_minutes));
    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'estimated_minutes must be a positive number' });
    }
    const rawDate = completed_date ? new Date(completed_date) : new Date();
    const date = rawDate.toISOString().slice(0, 10);
    const customerName = (customer || task_name || 'Internal').toString().trim();

    const entry = insertEntry({
      user, category: resolvedCategory, customer: customerName,
      notes: task_name || '', minutes, date, source: 'notion',
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error('Notion webhook error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/entries/bulk
// Generic bulk import — accepts array of entries (used by Make.com or CSV import)
// Each entry: { user, category, customer, notes, minutes, date, source }
router.post('/entries/bulk', (req, res) => {
  if (!verifyWebhookSecret(req, res)) return;

  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries must be a non-empty array' });
  }
  if (entries.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 entries per bulk request' });
  }

  const results = [];
  const errors = [];

  const importMany = db.transaction(() => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.user || !VALID_USERS.includes(e.user)) {
        errors.push({ index: i, error: 'Invalid user' }); continue;
      }
      if (!e.category || !VALID_CATEGORIES.includes(e.category)) {
        errors.push({ index: i, error: 'Invalid category' }); continue;
      }
      if (!e.customer || !e.customer.toString().trim()) {
        errors.push({ index: i, error: 'Missing customer' }); continue;
      }
      const minutes = Math.round(Number(e.minutes));
      if (!minutes || minutes <= 0) {
        errors.push({ index: i, error: 'Invalid minutes' }); continue;
      }
      if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
        errors.push({ index: i, error: 'Invalid date (YYYY-MM-DD required)' }); continue;
      }
      const source = VALID_SOURCES.includes(e.source) ? e.source : 'manual';
      results.push(insertEntry({ ...e, minutes, source }));
    }
  });

  try {
    importMany();
    res.status(201).json({ imported: results.length, errors });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/webhook/info — returns webhook URLs and setup instructions
router.get('/webhook/info', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  res.json({
    endpoints: {
      intercom: `${base}/api/webhook/intercom`,
      gcal:     `${base}/api/webhook/gcal`,
      notion:   `${base}/api/webhook/notion`,
      bulk:     `${base}/api/entries/bulk`,
    },
    auth: WEBHOOK_SECRET
      ? 'Set header: x-webhook-secret: <your-secret>'
      : 'No secret configured (open). Set WEBHOOK_SECRET env var to secure.',
    payloads: {
      intercom: { user: 'Egor', ticket_id: '12345', subject: 'API not working', customer: 'Acme Corp', closed_at: '2024-01-15T14:30:00Z', handle_time_minutes: 45 },
      gcal:     { user: 'Yonatan', event_title: 'Onboarding Call', customer: 'Beta Inc', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T11:00:00Z' },
      notion:   { user: 'Mariano', task_name: 'Write migration guide', customer: 'Internal', category: 'Documentation / KB', estimated_minutes: 90, completed_date: '2024-01-15' },
    },
  });
});

module.exports = router;
