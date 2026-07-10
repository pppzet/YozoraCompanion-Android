import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync("yozora-companion.db");
    migrate(db);
  }
  return db;
}

function migrate(database: SQLiteDatabase): void {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS characters(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isPlaceholder INTEGER NOT NULL DEFAULT 0,
      persona TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS character_images(
      characterId TEXT NOT NULL,
      expression TEXT NOT NULL,
      uri TEXT NOT NULL,
      PRIMARY KEY(characterId, expression)
    );
    CREATE TABLE IF NOT EXISTS lines(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      characterId TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      expression TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lines_character ON lines(characterId);
    CREATE TABLE IF NOT EXISTS calendar(
      date TEXT PRIMARY KEY,
      text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diary(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      text TEXT NOT NULL,
      imageUri TEXT,
      editedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS chat(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      characterId TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_character ON chat(characterId);
    CREATE TABLE IF NOT EXISTS meta(
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
