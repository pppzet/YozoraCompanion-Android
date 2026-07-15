export const EXPRESSIONS = ["normal", "smile", "sleepy", "surprised", "sad"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const CATEGORIES = [
  "greeting_morning",
  "greeting_day",
  "greeting_evening",
  "greeting_night",
  "tap",
  "pomodoro_done",
  "diary_saved",
  "schedule_prompt",
  "weather_clear",
  "weather_cloudy",
  "weather_rain",
  "weather_snow",
  "weather_storm",
  "weather_fog",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Character {
  id: string;
  name: string;
  isPlaceholder: boolean;
  persona: string;
  /** 表情ごとの画像ファイルURI（未登録の表情はキーなし） */
  images: Partial<Record<Expression, string>>;
}

export interface Line {
  id: number;
  characterId: string;
  category: Category;
  text: string;
  expression: Expression | null;
}

export interface CalendarEntry {
  date: string; // YYYY-MM-DD
  text: string;
}

export interface DiaryEntry {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  text: string;
  imageUri: string | null;
  editedAt: string | null; // ISO文字列
}

export interface ChatMessage {
  id: number;
  characterId: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface PomodoroSettings {
  work: number; // 分
  break: number; // 分
}

export interface WeatherLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface WeatherData {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export type AiProvider = "gemini" | "openai";

export interface AiSettings {
  provider: AiProvider;
  geminiModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "gemini",
  geminiModel: "gemini-2.5-flash",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",
};

export const DEFAULT_POMODORO: PomodoroSettings = { work: 25, break: 5 };
export interface UserProfile {
    callName: string; // 呼んでほしい名前
      personality: string; // 性格・特性など自由記述
      }

      export const DEFAULT_USER_PROFILE: UserProfile = {
        callName: "",
          personality: "",
}
