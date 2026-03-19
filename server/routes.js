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
    const stmt = db.prepare(`
      INSERT INTO entries (user, category, customer, notes, minutes, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const result = stmt.run(user, category, customer.trim(), notes || '', minutes, date);
    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
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

module.exports = router;
