/* oxlint-disable no-await-in-loop -- 画像を1枚ずつ処理してメモリ使用量を抑える（並列化しない方が安全） */
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { getDb } from "./db";
import { clearImageDir, readAsDataUrl, readTextFile, storeDataUrl, writeTextFile } from "./files";
import { pad2 } from "./format";
import * as repo from "./repo";

/**
 * バックアップはWeb版（pppzet/YozoraCompanion index.html）のJSONと同じ形。
 * Web版の書き出しをこのアプリに読み込めるし、その逆も可能。
 * 画像はdataURL、メタはWeb版のキー名で持つ。APIキーは含めない。
 */

interface BackupCharacter {
  id: string;
  name: string;
  images?: Record<string, string>;
  isPlaceholder?: boolean;
  persona?: string;
}

interface BackupDiaryEntry {
  id?: number;
  date: string;
  time: string;
  text: string;
  image?: string | null;
  editedAt?: string | null;
}

interface BackupPayload {
  app?: string;
  version?: number;
  exportedAt?: string;
  characters?: BackupCharacter[];
  lines?: { id?: number; characterId: string; category: string; text: string; expression?: string | null }[];
  calendar?: { date: string; text: string }[];
  diary?: BackupDiaryEntry[];
  chatHistory?: { id?: number; characterId: string; role: string; text: string; timestamp?: number }[];
  meta?: { key: string; value: unknown }[];
}

const STORE_KEYS = ["characters", "lines", "calendar", "diary", "chatHistory", "meta"] as const;

export async function exportBackup(): Promise<void> {
  const characters: BackupCharacter[] = [];
  for (const c of repo.getAllCharacters()) {
    const images: Record<string, string> = {};
    for (const [expression, uri] of Object.entries(c.images)) {
      if (!uri) continue;
      const dataUrl = await readAsDataUrl(uri);
      if (dataUrl) images[expression] = dataUrl;
    }
    characters.push({ id: c.id, name: c.name, images, isPlaceholder: c.isPlaceholder, persona: c.persona });
  }

  const lines = repo
    .getAllCharacters()
    .flatMap((c) => repo.getLinesForCharacter(c.id))
    .map((l) => ({
      id: l.id,
      characterId: l.characterId,
      category: l.category,
      text: l.text,
      expression: l.expression,
    }));

  const diary: BackupDiaryEntry[] = [];
  for (const e of [...repo.getAllDiaryEntries()].reverse()) {
    const image = e.imageUri ? await readAsDataUrl(e.imageUri) : null;
    diary.push({ id: e.id, date: e.date, time: e.time, text: e.text, image, editedAt: e.editedAt });
  }

  const chatHistory = repo
    .getAllCharacters()
    .flatMap((c) => repo.getChatHistory(c.id))
    .map((m) => ({ id: m.id, characterId: m.characterId, role: m.role, text: m.text, timestamp: m.timestamp }));

  // メタはWeb版のキー名に合わせる（customBackgroundはdataURL化）
  const EXCLUDED = new Set(["weatherCache", "customBackgroundUri", "notifPermissionAsked"]);
  const meta: { key: string; value: unknown }[] = [];
  for (const entry of repo.metaAll()) {
    if (EXCLUDED.has(entry.key)) continue;
    meta.push(entry);
  }
  const bgUri = repo.metaGet<string>("customBackgroundUri");
  if (bgUri) {
    const dataUrl = await readAsDataUrl(bgUri);
    if (dataUrl) meta.push({ key: "customBackground", value: dataUrl });
  }

  const payload: BackupPayload = {
    app: "yozora_companion",
    version: 2,
    exportedAt: new Date().toISOString(),
    characters,
    lines,
    calendar: repo.getAllCalendarEntries(),
    diary,
    chatHistory,
    meta,
  };

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  const uri = await writeTextFile(`yozora_companion_backup_${stamp}.json`, JSON.stringify(payload, null, 2));
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "バックアップを保存" });
}

export type ImportResult = { status: "done" } | { status: "canceled" } | { status: "invalid" };

/** ファイルを選んで中身を検証する（置き換え確認は呼び出し側で行う） */
export async function pickBackupFile(): Promise<
  { status: "picked"; payload: BackupPayload } | { status: "canceled" } | { status: "invalid" }
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "application/octet-stream", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { status: "canceled" };
  const asset = result.assets[0];
  if (!asset) return { status: "canceled" };
  let payload: BackupPayload;
  try {
    payload = JSON.parse(await readTextFile(asset.uri)) as BackupPayload;
  } catch {
    return { status: "invalid" };
  }
  const hasAny = STORE_KEYS.some((key) => Array.isArray(payload[key]));
  if (!hasAny) return { status: "invalid" };
  return { status: "picked", payload };
}

/** 今のデータを置き換えて復元する */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  repo.clearAllStores();
  await clearImageDir();
  const db = getDb();

  for (const c of payload.characters ?? []) {
    if (!c.id || !c.name) continue;
    db.runSync(
      "INSERT OR REPLACE INTO characters(id, name, isPlaceholder, persona, createdAt) VALUES(?, ?, ?, ?, ?)",
      c.id,
      c.name,
      c.isPlaceholder ? 1 : 0,
      c.persona ?? "",
      Date.now(),
    );
    for (const [expression, dataUrl] of Object.entries(c.images ?? {})) {
      if (typeof dataUrl !== "string") continue;
      const uri = await storeDataUrl(dataUrl, `char-${c.id}-${expression}`);
      if (uri) {
        db.runSync(
          "INSERT OR REPLACE INTO character_images(characterId, expression, uri) VALUES(?, ?, ?)",
          c.id,
          expression,
          uri,
        );
      }
    }
  }

  for (const l of payload.lines ?? []) {
    if (!l.characterId || !l.text) continue;
    if (typeof l.id === "number") {
      db.runSync(
        "INSERT OR REPLACE INTO lines(id, characterId, category, text, expression) VALUES(?, ?, ?, ?, ?)",
        l.id,
        l.characterId,
        l.category,
        l.text,
        l.expression ?? null,
      );
    } else {
      db.runSync(
        "INSERT INTO lines(characterId, category, text, expression) VALUES(?, ?, ?, ?)",
        l.characterId,
        l.category,
        l.text,
        l.expression ?? null,
      );
    }
  }

  for (const entry of payload.calendar ?? []) {
    if (!entry.date) continue;
    db.runSync("INSERT OR REPLACE INTO calendar(date, text) VALUES(?, ?)", entry.date, entry.text ?? "");
  }

  for (const e of payload.diary ?? []) {
    if (!e.date) continue;
    let imageUri: string | null = null;
    if (typeof e.image === "string" && e.image.startsWith("data:")) {
      imageUri = await storeDataUrl(e.image, `diary-${e.id ?? "x"}`);
    }
    if (typeof e.id === "number") {
      db.runSync(
        "INSERT OR REPLACE INTO diary(id, date, time, text, imageUri, editedAt) VALUES(?, ?, ?, ?, ?, ?)",
        e.id,
        e.date,
        e.time ?? "",
        e.text ?? "",
        imageUri,
        e.editedAt ?? null,
      );
    } else {
      db.runSync(
        "INSERT INTO diary(date, time, text, imageUri, editedAt) VALUES(?, ?, ?, ?, ?)",
        e.date,
        e.time ?? "",
        e.text ?? "",
        imageUri,
        e.editedAt ?? null,
      );
    }
  }

  for (const m of payload.chatHistory ?? []) {
    if (!m.characterId || !m.text) continue;
    const role = m.role === "user" ? "user" : "model";
    if (typeof m.id === "number") {
      db.runSync(
        "INSERT OR REPLACE INTO chat(id, characterId, role, text, timestamp) VALUES(?, ?, ?, ?, ?)",
        m.id,
        m.characterId,
        role,
        m.text,
        m.timestamp ?? Date.now(),
      );
    } else {
      db.runSync(
        "INSERT INTO chat(characterId, role, text, timestamp) VALUES(?, ?, ?, ?)",
        m.characterId,
        role,
        m.text,
        m.timestamp ?? Date.now(),
      );
    }
  }

  for (const m of payload.meta ?? []) {
    if (!m.key || m.key === "geminiApiKey" || m.key === "weatherCache") continue;
    if (m.key === "customBackground") {
      if (typeof m.value === "string" && m.value.startsWith("data:")) {
        const uri = await storeDataUrl(m.value, "background");
        if (uri) repo.metaSet("customBackgroundUri", uri);
      }
      continue;
    }
    repo.metaSet(m.key, m.value);
  }

  // 復元後にサンプルデータを重ねて作らないようにする
  repo.metaSet("seeded", true);
}
