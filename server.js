const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Setup ──────────────────────────────────────────
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'lunch_roulette.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Prepared Statements
const getItemsStmt = db.prepare('SELECT id, name, category, area, image_url FROM foods ORDER BY id');
const getVotedStmt = db.prepare('SELECT food_id FROM votes WHERE session_id = ?');
const insertVoteStmt = db.prepare(`
  INSERT INTO votes (food_id, choice, session_id)
  VALUES (?, ?, ?)
  ON CONFLICT(food_id, session_id) DO UPDATE SET choice = excluded.choice
`);
const getResultsStmt = db.prepare(`
  SELECT
    f.id, f.name, f.category, f.area, f.image_url,
    COALESCE(SUM(CASE WHEN v.choice = 'yes' THEN 1 ELSE 0 END), 0) AS yes_count,
    COALESCE(SUM(CASE WHEN v.choice = 'no' THEN 1 ELSE 0 END), 0) AS no_count,
    CASE
      WHEN COUNT(v.id) = 0 THEN 0
      ELSE ROUND(100.0 * SUM(CASE WHEN v.choice = 'yes' THEN 1 ELSE 0 END) / COUNT(v.id), 1)
    END AS yes_pct
  FROM foods f
  LEFT JOIN votes v ON f.id = v.food_id
  GROUP BY f.id
  ORDER BY yes_pct DESC
`);
// ─── GET /items ──────────────────────────────────────────────
// Returns all food items for the swipe deck
app.get('/items', (req, res) => {
  try {
    const items = getItemsStmt.all();
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ─── GET /voted/:sessionId ───────────────────────────────────
// Returns food IDs already voted on by this session
app.get('/voted/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const voted = getVotedStmt.all(sessionId);
    res.json(voted);
  } catch (err) {
    console.error('Error fetching voted items:', err);
    res.status(500).json({ error: 'Failed to fetch voted items' });
  }
});

// ─── POST /vote ──────────────────────────────────────────────
// Accepts { itemId, choice, sessionId } — upserts one vote per item per session
app.post('/vote', (req, res) => {
  const { itemId, choice, sessionId } = req.body;

  // Validate input
  if (!itemId || !choice || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields: itemId, choice, sessionId' });
  }
  if (choice !== 'yes' && choice !== 'no') {
    return res.status(400).json({ error: 'choice must be "yes" or "no"' });
  }

  try {
    insertVoteStmt.run(itemId, choice, sessionId);
    console.log(`[VOTE] item=${itemId} choice=${choice} session=${sessionId}`);
    res.json({ success: true, itemId, choice, sessionId });
  } catch (err) {
    console.error('Error inserting vote:', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ─── GET /results ────────────────────────────────────────────
// Returns all foods with aggregated vote counts, sorted by yes_pct DESC
app.get('/results', (req, res) => {
  try {
    const results = getResultsStmt.all();
    res.json(results);
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎰 Lunch Roulette server running → http://localhost:${PORT}`);
});
