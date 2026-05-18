const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'lunch_roulette.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    area TEXT,
    image_url TEXT,
    external_id TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id INTEGER NOT NULL,
    choice TEXT CHECK(choice IN ('yes','no')) NOT NULL,
    session_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(food_id, session_id),
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );
`);

const insertFood = db.prepare(`
  INSERT OR IGNORE INTO foods (name, category, area, image_url, external_id)
  VALUES (?, ?, ?, ?, ?)
`);

async function seed() {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'];
  let totalSeeded = 0;

  console.log('🌱 Starting Lunch Roulette Seed...');

  for (const letter of letters) {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
      const data = await response.json();
      
      let letterCount = 0;
      if (data.meals) {
        for (const meal of data.meals) {
          const result = insertFood.run(
            meal.strMeal,
            meal.strCategory,
            meal.strArea,
            meal.strMealThumb,
            meal.idMeal
          );
          if (result.changes > 0) {
            letterCount++;
            totalSeeded++;
          }
        }
      }
      console.log(`[${letter}] Inserted ${letterCount} meals`);
      
      // Be polite to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Error fetching for letter ${letter}:`, err);
    }
  }

  console.log(`\n✅ Seeded ${totalSeeded} total meals successfully!`);
}

seed();
