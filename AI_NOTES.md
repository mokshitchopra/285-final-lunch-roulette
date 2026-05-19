# AI Collaboration Notes — Lunch Roulette

## Overview
Lunch Roulette is a mobile-first swipe-to-vote web app where users browse real food dishes and vote yes or no on whether they'd eat each one tonight. Votes are aggregated across all users on a shared backend. Claude (Anthropic) was used as the primary coding assistant to scaffold, implement, and debug the entire application end-to-end in a single session.

## What Claude Did Well
- Scaffolded the Express server with proper middleware (CORS, JSON parsing, static file serving) and connected it to SQLite using `better-sqlite3` with prepared statements and WAL mode
- Built a robust seed script that fetches 340+ real meals from TheMealDB free API, handling pagination by letter, deduplication via `INSERT OR IGNORE`, and polite API rate-limiting
- Implemented the Hammer.js swipe gesture system with rotation, directional color overlays, stamp labels, threshold-based commit-or-snapback logic, and fly-out animations
- Designed a clean dark-theme UI with glassmorphism badges, frosted-glass buttons, gradient progress bars, and smooth micro-animations — all in vanilla CSS without any framework

## Where I Pushed Back / Corrected Claude
- Claude initially used deprecated Unsplash source URLs for placeholder images — I directed it to use TheMealDB's `strMealThumb` field as the real image source instead
- The first implementation of drag feedback was minimal (no overlay tint, no stamp labels during drag) — I specified the exact visual feedback behavior: green/red overlay scaling with deltaX, bold ✓YES / ✗NO stamps appearing after 40px threshold
- Claude's first version of the card stack used `position: fixed` instead of `position: absolute` within the app container, which caused the back cards to bleed outside the phone frame at full viewport width. I identified this during testing and told Claude to scope all card positioning to the `.card-stack` parent element.

## Architectural Decisions I Made
- Chose SQLite with `better-sqlite3` over MongoDB or PostgreSQL for zero-setup local persistence — a single `.db` file that gets auto-created by the seed script, perfect for a class project with no deployment complexity
- Used Vanilla JS with a single `index.html` + `style.css` + `app.js` instead of React or any framework, avoiding build tools entirely — the app loads instantly from Express's static middleware with no transpilation step
- Session identity is handled client-side only (`crypto.randomUUID()` stored in localStorage) — no user accounts, no cookies, just a UUID that travels with each vote POST to enforce one-vote-per-food-per-session on the server

## What Surprised Me
- Claude generated a remarkably polished dark-mode design system on the first pass — the frosted glass tab bar, card shadows, and gradient progress bars looked production-quality without any iteration on aesthetics
- Claude had difficulty maintaining the swipe gesture state when the card stack re-rendered after each vote — it would lose the Hammer.js instance reference on the new top card. I had to explicitly direct it to re-attach the gesture handler after each card dismissal rather than attaching it once on load.

## Prompting Strategy
- I used a step-by-step vertical approach — one complete feature per prompt, confirmed working before moving on. I gave Claude the full data schema and endpoint spec upfront in the first prompt, then built: server → seed → card UI → gesture logic → results view → polish iterations. This prevented Claude from making assumptions about data shape mid-build.
