import * as SecureStore from "expo-secure-store";
import { metaGet, metaSet } from "./repo";
import { DEFAULT_AI_SETTINGS } from "./types";
import type { AiProvider, AiSettings } from "./types";

const SECURE_KEYS: Record<AiProvider, string> = {
  gemini: "ai_gemini_key",
  openai: "ai_openai_key",
};

export function getAiSettings(): AiSettings {
  const stored = metaGet<Partial<AiSettings>>("aiSettings");
  return { ...DEFAULT_AI_SETTINGS, ...stored };
}

export function saveAiSettings(settings: AiSettings): void {
  metaSet("aiSettings", settings);
}

export async function getApiKey(provider: AiProvider): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(SECURE_KEYS[provider])) ?? "";
  } catch {
    return "";
  }
}

export async function setApiKey(provider: AiProvider, key: string): Promise<void> {
  if (key) {
    await SecureStore.setItemAsync(SECURE_KEYS[provider], key);
  } else {
    await SecureStore.deleteItemAsync(SECURE_KEYS[provider]);
  }
}

export interface AiChatTurn {
  role: "user" | "model";
  text: string;
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

/** キャラ設定を組み込んだシステムプロンプト（Web版と同じ構成） */
export function buildSystemText(name: string, persona: string, personaHints: string[]): string {
  let systemText = `あなたは「${name}」という名前のキャラクターです。`;
  if (persona.trim()) {
    systemText += `\n\n次の設定になりきって、ユーザーと会話してください。\n${persona.trim()}`;
  } else {
    systemText +=
      "ユーザーの創作コンパニオンとして、親しみやすく穏やかな口調で会話してください。" +
      "相手を急かしたり詰めたりせず、優しく寄り添う話し方をしてください。";
  }
  if (personaHints.length > 0) {
    systemText += `\n\n口調の参考例：${personaHints.join(" / ")}`;
  }
  systemText += "\n\n返信は2〜3文程度の短さを目安にしてください。";
  return systemText;
}

async function callGemini(apiKey: string, model: string, systemText: string, turns: AiChatTurn[]): Promise<AiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemText }] }, contents }),
    });
    if (!res.ok) {
      return { ok: false, error: `エラーが起きたよ(コード${res.status})。キーや利用状況を確認してみてね。` };
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return { ok: false, error: "うまく返事を受け取れなかったよ。" };
    return { ok: true, text: reply.trim() };
  } catch {
    return { ok: false, error: "通信エラーだよ。ネット環境を確認してね。" };
  }
}

async function callOpenAiCompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemText: string,
  turns: AiChatTurn[],
): Promise<AiResult> {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const messages = [
    { role: "system", content: systemText },
    ...turns.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text })),
  ];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // ローカルサーバー（LM Studio / Ollama など）はキー無しでも使えるようにする
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ model, messages }) });
    if (!res.ok) {
      return { ok: false, error: `エラーが起きたよ(コード${res.status})。接続先やキーを確認してみてね。` };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return { ok: false, error: "うまく返事を受け取れなかったよ。" };
    return { ok: true, text: reply.trim() };
  } catch {
    return { ok: false, error: "通信エラーだよ。接続先URLとネット環境を確認してね。" };
  }
}

/** 設定中のプロバイダでチャット補完を呼ぶ */
export async function callAi(systemText: string, turns: AiChatTurn[]): Promise<AiResult> {
  const settings = getAiSettings();
  const apiKey = await getApiKey(settings.provider);
  if (settings.provider === "gemini") {
    if (!apiKey) return { ok: false, error: "設定タブでGemini APIキーを登録してね。" };
    return callGemini(apiKey, settings.geminiModel, systemText, turns);
  }
  return callOpenAiCompatible(apiKey, settings.openaiBaseUrl, settings.openaiModel, systemText, turns);
}
