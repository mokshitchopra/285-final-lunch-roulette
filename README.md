# Lunch Roulette 🎰

A mobile-first swipe-to-vote food discovery app, created for the CMPE 285 Final Submission.
"Would you eat this tonight?"

## Tech Stack
* **Frontend**: HTML5, Vanilla JS, CSS3
* **Backend**: Node.js, Express
* **Database**: SQLite3 via `better-sqlite3`
* **Data Source**: [TheMealDB](https://www.themealdb.com/api.php)

## Setup & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Seed the Database** (Fetch meals from API)
   ```bash
   npm run seed
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **View Application**
   Open `http://localhost:3000` in your web browser. (Use mobile dimensions for best experience).

## API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/items` | Returns all available food items |
| `GET` | `/voted/:sessionId` | Returns IDs of foods already voted on by the session |
| `POST` | `/vote` | Submit a vote (`{ itemId, choice: 'yes'/'no', sessionId }`) |
| `GET` | `/results` | Returns aggregated vote statistics |
