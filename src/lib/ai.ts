import * as SecureStore from "expo-secure-store";
import { metaGet, metaSet } from "./repo";
import { DEFAULT_AI_SETTINGS, DEFAULT_USER_PROFILE } from "./types";
import type { AiProvider, AiSettings, UserProfile } from "./types";

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
export function getUserProfile(): UserProfile {
    const stored = metaGet<Partial<UserProfile>>("userProfile");
      return { ...DEFAULT_USER_PROFILE, ...stored };
      }

      export function saveUserProfile(profile: UserProfile): void {
        metaSet("userProfile", profile);
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
export function buildSystemText(
  name: string,
  persona: string,
  personaHints: string[],
  userProfile?: UserProfile,
): string {
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
  if (userProfile?.callName.trim()) {
    systemText += `\n\nユーザーのことは「${userProfile.callName.trim()}」と呼んでください。`;
  }
  if (userProfile?.personality.trim()) {
    systemText += `\n\nユーザーについて:\n${userProfile.personality.trim()}`;
  }
  systemText += "\n\n返信は2〜3文程度の短さを目安にしてください。";
  return systemText;
}

/**
 * GeminiのHTTPエラーを原因ごとに分類する。
 *
 * 注意: APIキー無効も、リクエスト内容の不正（モデル名ミスなど）も
 * どちらもHTTP 400で返ってくるため、ステータスコードだけでは区別できない。
 * レスポンス本文の message / status まで見て判定する。
 * (参考: https://ai.google.dev/gemini-api/docs/troubleshooting)
 */
function classifyGeminiError(
  status: number,
  body: { error?: { status?: string; message?: string } } | null,
): { userMessage: string; technicalDetail: string } {
  const errStatus = body?.error?.status ?? "";
  const errMessage = body?.error?.message ?? "";
  const technicalDetail = `HTTP ${status} / ${errStatus}: ${errMessage}`;

  switch (status) {
    case 400:
      if (/api key/i.test(errMessage)) {
        return {
          userMessage: "APIキーが正しくないみたいだよ。設定タブでキーを確認してみてね。",
          technicalDetail,
        };
      }
      if (errStatus === "FAILED_PRECONDITION") {
        return {
          userMessage: "この地域だと無料枠が使えないみたい。課金設定を確認してみてね。",
          technicalDetail,
        };
      }
      return {
        userMessage: "リクエストの内容がおかしいみたい。モデル名などを確認してみてね。",
        technicalDetail,
      };
    case 403:
      return {
        userMessage: "このAPIキーには権限がないみたいだよ。キーの設定を確認してみてね。",
        technicalDetail,
      };
    case 404:
      return {
        userMessage: "指定したモデルが見つからないみたい。モデル名やバージョンを確認してみてね。",
        technicalDetail,
      };
    case 429:
      return {
        userMessage: "アクセスが集中しているみたい。少し時間をおいてから試してみてね。",
        technicalDetail,
      };
    case 500:
    case 503:
      return {
        userMessage: "サーバー側が混み合っているみたい。少し時間をおいてから試してみてね。",
        technicalDetail,
      };
    case 504:
      return {
        userMessage: "応答に時間がかかりすぎたみたい。メッセージを短くして試してみてね。",
        technicalDetail,
      };
    default:
      return {
        userMessage: `エラーが起きたよ(コード${status})。キーや利用状況を確認してみてね。`,
        technicalDetail,
      };
  }
}

/**
 * OpenAI互換APIのHTTPエラーを原因ごとに分類する。
 * (LM Studio / Ollama 等のローカルサーバーも含む)
 */
function classifyOpenAiError(
  status: number,
  body: { error?: { message?: string; code?: string | null; type?: string } } | null,
): { userMessage: string; technicalDetail: string } {
  const errMessage = body?.error?.message ?? "";
  const errType = body?.error?.type ?? body?.error?.code ?? "";
  const technicalDetail = `HTTP ${status} / ${errType}: ${errMessage}`;

  switch (status) {
    case 401:
      return {
        userMessage: "APIキーが正しくないみたいだよ。設定タブでキーを確認してみてね。",
        technicalDetail,
      };
    case 403:
      return {
        userMessage: "このAPIキーには権限がないみたいだよ。キーの設定を確認してみてね。",
        technicalDetail,
      };
    case 404:
      return {
        userMessage: "接続先URLかモデル名が正しくないみたい。設定を確認してみてね。",
        technicalDetail,
      };
    case 429:
      return {
        userMessage: "アクセスが集中しているみたい。少し時間をおいてから試してみてね。",
        technicalDetail,
      };
    case 500:
    case 502:
    case 503:
      return {
        userMessage: "接続先のサーバー側が混み合っているみたい。少し時間をおいてから試してみてね。",
        technicalDetail,
      };
    default:
      return {
        userMessage: `エラーが起きたよ(コード${status})。接続先やキーを確認してみてね。`,
        technicalDetail,
      };
  }
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
      const errBody = (await res.json().catch(() => null)) as {
        error?: { status?: string; message?: string };
      } | null;
      const { userMessage, technicalDetail } = classifyGeminiError(res.status, errBody);
      console.error(`[Gemini API Error] ${technicalDetail}`);
      return { ok: false, error: userMessage };
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
      const errBody = (await res.json().catch(() => null)) as {
        error?: { message?: string; code?: string | null; type?: string };
      } | null;
      const { userMessage, technicalDetail } = classifyOpenAiError(res.status, errBody);
      console.error(`[OpenAI-compatible API Error] ${technicalDetail}`);
      return { ok: false, error: userMessage };
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
