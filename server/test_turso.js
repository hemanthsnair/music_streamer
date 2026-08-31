import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Error: TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

console.log("Connecting to Turso at:", url);
const client = createClient({ url, authToken });

async function diagnose() {
  try {
    // 1. Check existing tables
    console.log("Fetching existing tables...");
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Current tables in database:", tables.rows.map(r => r.name));

    // 2. Try creating the users table manually to see if there's any error
    console.log("Testing CREATE TABLE users...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Success! Users table verified/created.");

    // 3. Check again
    const tablesAfter = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Tables after check:", tablesAfter.rows.map(r => r.name));

  } catch (err) {
    console.error("Database diagnosis failed with error:");
    console.error(err);
  }
}

diagnose();
