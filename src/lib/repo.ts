import { getDb } from "./db";
import { SAMPLE_LINES } from "./dialogue";
import { DEFAULT_POMODORO, EXPRESSIONS } from "./types";
import type { CalendarEntry, Category, Character, ChatMessage, DiaryEntry, Expression, Line } from "./types";

/* ---------------- meta（JSON値のキーバリュー） ---------------- */

export function metaGet<T>(key: string): T | null {
  const row = getDb().getFirstSync<{ value: string }>("SELECT value FROM meta WHERE key = ?", key);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function metaSet(key: string, value: unknown): void {
  getDb().runSync(
    "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    JSON.stringify(value),
  );
}

export function metaDelete(key: string): void {
  getDb().runSync("DELETE FROM meta WHERE key = ?", key);
}

export function metaAll(): { key: string; value: unknown }[] {
  const rows = getDb().getAllSync<{ key: string; value: string }>("SELECT key, value FROM meta");
  return rows.map((r) => {
    let value: unknown = null;
    try {
      value = JSON.parse(r.value);
    } catch {
      value = null;
    }
    return { key: r.key, value };
  });
}

/* ---------------- キャラクター ---------------- */

interface CharacterRow {
  id: string;
  name: string;
  isPlaceholder: number;
  persona: string;
}

function loadImages(characterId: string): Partial<Record<Expression, string>> {
  const rows = getDb().getAllSync<{ expression: string; uri: string }>(
    "SELECT expression, uri FROM character_images WHERE characterId = ?",
    characterId,
  );
  const images: Partial<Record<Expression, string>> = {};
  for (const row of rows) {
    if ((EXPRESSIONS as readonly string[]).includes(row.expression)) {
      images[row.expression as Expression] = row.uri;
    }
  }
  return images;
}

export function getAllCharacters(): Character[] {
  const rows = getDb().getAllSync<CharacterRow>("SELECT * FROM characters ORDER BY createdAt");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isPlaceholder: r.isPlaceholder === 1,
    persona: r.persona,
    images: loadImages(r.id),
  }));
}

export function insertCharacter(c: { id: string; name: string; isPlaceholder: boolean }): void {
  getDb().runSync(
    "INSERT INTO characters(id, name, isPlaceholder, persona, createdAt) VALUES(?, ?, ?, '', ?)",
    c.id,
    c.name,
    c.isPlaceholder ? 1 : 0,
    Date.now(),
  );
}

export function deleteCharacter(id: string): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync("DELETE FROM characters WHERE id = ?", id);
    db.runSync("DELETE FROM character_images WHERE characterId = ?", id);
    db.runSync("DELETE FROM lines WHERE characterId = ?", id);
    db.runSync("DELETE FROM chat WHERE characterId = ?", id);
  });
}

export function updatePersona(characterId: string, persona: string): void {
  getDb().runSync("UPDATE characters SET persona = ? WHERE id = ?", persona, characterId);
}

export function setCharacterImage(characterId: string, expression: Expression, uri: string): void {
  getDb().runSync(
    "INSERT INTO character_images(characterId, expression, uri) VALUES(?, ?, ?) " +
      "ON CONFLICT(characterId, expression) DO UPDATE SET uri = excluded.uri",
    characterId,
    expression,
    uri,
  );
}

export function deleteCharacterImage(characterId: string, expression: Expression): void {
  getDb().runSync("DELETE FROM character_images WHERE characterId = ? AND expression = ?", characterId, expression);
}

/* ---------------- セリフ ---------------- */

interface LineRow {
  id: number;
  characterId: string;
  category: string;
  text: string;
  expression: string | null;
}

function rowToLine(r: LineRow): Line {
  return {
    id: r.id,
    characterId: r.characterId,
    category: r.category as Category,
    text: r.text,
    expression: (r.expression as Expression | null) ?? null,
  };
}

export function getLinesForCharacter(characterId: string): Line[] {
  const rows = getDb().getAllSync<LineRow>("SELECT * FROM lines WHERE characterId = ? ORDER BY id", characterId);
  return rows.map(rowToLine);
}

export function insertLine(line: Omit<Line, "id">): void {
  getDb().runSync(
    "INSERT INTO lines(characterId, category, text, expression) VALUES(?, ?, ?, ?)",
    line.characterId,
    line.category,
    line.text,
    line.expression,
  );
}

export function deleteLine(id: number): void {
  getDb().runSync("DELETE FROM lines WHERE id = ?", id);
}

/* ---------------- カレンダー ---------------- */

export function getAllCalendarEntries(): CalendarEntry[] {
  return getDb().getAllSync<CalendarEntry>("SELECT date, text FROM calendar");
}

export function upsertCalendarEntry(date: string, text: string): void {
  getDb().runSync(
    "INSERT INTO calendar(date, text) VALUES(?, ?) ON CONFLICT(date) DO UPDATE SET text = excluded.text",
    date,
    text,
  );
}

export function deleteCalendarEntry(date: string): void {
  getDb().runSync("DELETE FROM calendar WHERE date = ?", date);
}

/* ---------------- 日記 ---------------- */

export function getAllDiaryEntries(): DiaryEntry[] {
  return getDb().getAllSync<DiaryEntry>("SELECT * FROM diary ORDER BY id DESC");
}

export function insertDiaryEntry(e: Omit<DiaryEntry, "id" | "editedAt">): number {
  const result = getDb().runSync(
    "INSERT INTO diary(date, time, text, imageUri, editedAt) VALUES(?, ?, ?, ?, NULL)",
    e.date,
    e.time,
    e.text,
    e.imageUri,
  );
  return Number(result.lastInsertRowId);
}

export function updateDiaryEntry(id: number, text: string, imageUri: string | null): void {
  getDb().runSync(
    "UPDATE diary SET text = ?, imageUri = ?, editedAt = ? WHERE id = ?",
    text,
    imageUri,
    new Date().toISOString(),
    id,
  );
}

export function deleteDiaryEntry(id: number): void {
  getDb().runSync("DELETE FROM diary WHERE id = ?", id);
}

/* ---------------- チャット履歴 ---------------- */

export function getChatHistory(characterId: string): ChatMessage[] {
  return getDb().getAllSync<ChatMessage>("SELECT * FROM chat WHERE characterId = ? ORDER BY id", characterId);
}

export function insertChatMessage(m: Omit<ChatMessage, "id">): void {
  getDb().runSync(
    "INSERT INTO chat(characterId, role, text, timestamp) VALUES(?, ?, ?, ?)",
    m.characterId,
    m.role,
    m.text,
    m.timestamp,
  );
}

export function clearChatHistory(characterId: string): void {
  getDb().runSync("DELETE FROM chat WHERE characterId = ?", characterId);
}

/* ---------------- 全消去（バックアップ復元用） ---------------- */

export function clearAllStores(): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync("DELETE FROM characters");
    db.runSync("DELETE FROM character_images");
    db.runSync("DELETE FROM lines");
    db.runSync("DELETE FROM calendar");
    db.runSync("DELETE FROM diary");
    db.runSync("DELETE FROM chat");
    db.runSync("DELETE FROM meta");
  });
}

/* ---------------- 初期データ ---------------- */

export const SAMPLE_CHARACTER_ID = "sample-luna";

export function seedIfNeeded(): void {
  if (metaGet<boolean>("seeded")) return;
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync(
      "INSERT OR IGNORE INTO characters(id, name, isPlaceholder, persona, createdAt) VALUES(?, 'ルナ', 1, '', ?)",
      SAMPLE_CHARACTER_ID,
      Date.now(),
    );
    for (const [category, text, expression] of SAMPLE_LINES) {
      db.runSync(
        "INSERT INTO lines(characterId, category, text, expression) VALUES(?, ?, ?, ?)",
        SAMPLE_CHARACTER_ID,
        category,
        text,
        expression,
      );
    }
  });
  metaSet("activeCharacterId", SAMPLE_CHARACTER_ID);
  metaSet("pomodoroSettings", DEFAULT_POMODORO);
  metaSet("seeded", true);
}
