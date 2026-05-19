# Lunch Roulette 🎰

A mobile-first swipe-to-vote food discovery app, created for the CMPE 285 Final Submission.  
*"Would you eat this tonight?"*

Users swipe through real food dishes (sourced from TheMealDB), voting yes or no on each one. Votes are aggregated across all sessions on a shared backend, and a results view ranks dishes by popularity or divisiveness.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla JS (ES6), CSS3 |
| **Backend** | Node.js, Express |
| **Database** | SQLite3 via `better-sqlite3` (WAL mode) |
| **Gestures** | Hammer.js (CDN) |
| **Data Source** | [TheMealDB](https://www.themealdb.com/api.php) — free, no API key required |

## Setup & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Seed the Database** (fetches 100 real meals from TheMealDB API)
   ```bash
   npm run seed
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Open in Browser**  
   Navigate to `http://localhost:3000`. For best experience, use Chrome DevTools mobile view (430px width) or a real phone on the same network.

## Architecture

```
285-final/
├── server.js          # Express server — REST API (/items, /vote, /voted, /results)
├── seed.js            # Fetches meals from TheMealDB and populates SQLite
├── lunch_roulette.db  # SQLite database (auto-created by seed)
├── package.json
├── AI_NOTES.md        # AI usage write-up (Section 6)
└── public/
    ├── index.html     # Single-page app shell
    ├── style.css      # Full design system (dark theme, phone-frame layout)
    └── app.js         # Client logic — gestures, card stack, results rendering
```

**Data flow:** The seed script fetches dishes from TheMealDB by letter (a–m), inserts them into a `foods` table with `INSERT OR IGNORE` for deduplication. The Express server exposes four REST endpoints. The client generates a `sessionId` via `crypto.randomUUID()` stored in localStorage — this UUID is sent with every vote POST to enforce one-vote-per-dish-per-user on the backend via a `UNIQUE(food_id, session_id)` constraint.

**Card stack architecture:** Three cards are rendered in the DOM at once (card-1, card-2, card-3). When the top card is swiped, it flies out, cards promote in-place (card-2 → card-1, card-3 → card-2), and a new card-3 is injected at the back. Hammer.js is re-attached to the new top card after each dismissal. Images are preloaded in batches to eliminate load flicker.

## Core & Stretch Requirements

### Core Requirements Completed
- [x] Full-stack web application with Express backend and vanilla JS frontend
- [x] SQLite database with structured schema (foods + votes tables, foreign keys)
- [x] RESTful API: `GET /items`, `GET /voted/:sessionId`, `POST /vote`, `GET /results`
- [x] Real data sourced from a public API (TheMealDB — 100 dishes)
- [x] Interactive UI with swipe gestures (Hammer.js), button voting, and tab navigation
- [x] Session-based vote tracking (one vote per dish per user)
- [x] Results view with aggregated vote statistics

### Stretch Features Completed
- [x] Swipe gesture feedback — rotation, directional color overlays, ✓YES / ✗NO stamps
- [x] Card stack with 3-card depth effect (scale + translateY + opacity)
- [x] Image preloading for instant card transitions
- [x] Color-coded progress bars (green ≥70%, yellow ≥40%, red <40%)
- [x] Rank badges with gold/silver/bronze for top 3 results
- [x] Dual sort modes (Most Popular vs Most Divisive)
- [x] Staggered bar animation on results load
- [x] End-of-deck state with fadeInUp animation and CTA
- [x] Phone-frame desktop layout (430px centered column with shadow)
- [x] Frosted-glass tab bar with backdrop-filter blur

## Known Issues

- The app uses client-side session IDs (localStorage) — clearing browser data resets the session and allows re-voting on all dishes
- TheMealDB occasionally returns broken image URLs for a small number of dishes; these display with a dark fallback background
- The swipe gesture requires horizontal panning — vertical scrolling is intentionally disabled on the card to prevent gesture conflicts
- SQLite is a single-file database with no concurrent write safety beyond WAL mode — not suitable for high-traffic production use

## AI Usage

See [AI_NOTES.md](AI_NOTES.md) for the full AI collaboration write-up (Section 6), including what Claude did well, where I pushed back, architectural decisions, and my prompting strategy.
