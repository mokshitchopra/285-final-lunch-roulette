# AI Collaboration Notes — Lunch Roulette

## Overview
Lunch Roulette is a mobile-first swipe-to-vote web app where users browse real food dishes and vote yes or no on whether they'd eat each one tonight. Votes are aggregated across all users on a shared backend. Claude (Anthropic) was used as the primary coding assistant to scaffold, implement, and debug the entire application end-to-end in a single session.

## What Claude Did Well

- Got the Express server and SQLite setup done in one shot, I basically gave it the schema and endpoints I wanted and it came back with working code I only had to run, not debug
- The seed script was the biggest time save, fetching from TheMealDB across 13 letters, deduping, and inserting 100 meals would have taken me an hour to write manually
- The Hammer.js swipe logic was solid on the first pass, rotation, fly-out animation, snapback threshold all worked
- First-pass CSS was cleaner than I expected, the dark card layout with gradient overlays needed minimal tweaking

## Where I Pushed Back / Corrected Claude
- Claude initially used deprecated Unsplash source URLs for placeholder images — I directed it to use TheMealDB's `strMealThumb` field as the real image source instead
- The first implementation of drag feedback was minimal (no overlay tint, no stamp labels during drag) — I specified the exact visual feedback behavior: green/red overlay scaling with deltaX, bold ✓YES / ✗NO stamps appearing after 40px threshold
- Claude's first version of the card stack used `position: fixed` instead of `position: absolute` within the app container, which caused the back cards to bleed outside the phone frame at full viewport width. I identified this during testing and told Claude to scope all card positioning to the `.card-stack` parent element.

## Architectural Decisions I Made
- Chose SQLite with `better-sqlite3` over MongoDB or PostgreSQL for zero-setup local persistence, no database server to spin up — the .db file just appears when you run the seed script.
- Used Vanilla JS with a single `index.html`, `style.css`, and `app.js` instead of React or any framework, avoiding build tools entirely, so the app loads instantly from Express's static middleware with no transpilation step
- Session identity is handled client-side only, using `crypto.randomUUID()` stored in localStorage, so no user accounts, no cookies, just a UUID that travels with each vote POST to enforce one-vote-per-food-per-session on the server

## What Surprised Me
- Honestly surprised how little back-and-forth the backend needed, I expected to debug the SQLite queries more but the first version mostly worked.

## Prompting Strategy
- I used a step-by-step vertical approach — one complete feature per prompt, confirmed working before moving on. I gave Claude the full data schema and endpoint spec upfront in the first prompt, then built: server → seed → card UI → gesture logic → results view → polish iterations. This prevented Claude from making assumptions about data shape mid-build.
