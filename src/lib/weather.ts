import type { Category, WeatherData, WeatherLocation } from "./types";

export const WEATHER_CODE_MAP: Record<number, readonly [string, string]> = {
  0: ["☀️", "快晴"],
  1: ["🌤️", "晴れ"],
  2: ["⛅", "晴れ時々くもり"],
  3: ["☁️", "くもり"],
  45: ["🌫️", "霧"],
  48: ["🌫️", "霧氷"],
  51: ["🌦️", "霧雨"],
  53: ["🌦️", "霧雨"],
  55: ["🌦️", "霧雨"],
  56: ["🌧️", "着氷性の霧雨"],
  57: ["🌧️", "着氷性の霧雨"],
  61: ["🌧️", "弱い雨"],
  63: ["🌧️", "雨"],
  65: ["🌧️", "強い雨"],
  66: ["🌧️", "着氷性の雨"],
  67: ["🌧️", "着氷性の雨"],
  71: ["🌨️", "弱い雪"],
  73: ["🌨️", "雪"],
  75: ["🌨️", "強い雪"],
  77: ["🌨️", "霧雪"],
  80: ["🌦️", "にわか雨"],
  81: ["🌦️", "にわか雨"],
  82: ["🌧️", "激しいにわか雨"],
  85: ["🌨️", "にわか雪"],
  86: ["🌨️", "強いにわか雪"],
  95: ["⛈️", "雷雨"],
  96: ["⛈️", "雷雨"],
  99: ["⛈️", "雷雨"],
};

export function weatherCodeInfo(code: number): readonly [string, string] {
  return WEATHER_CODE_MAP[code] ?? ["🌡️", "—"];
}

export function weatherCategory(code: number): Category | null {
  if (code === 0 || code === 1) return "weather_clear";
  if (code === 2 || code === 3) return "weather_cloudy";
  if (code === 45 || code === 48) return "weather_fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "weather_rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather_snow";
  if ([95, 96, 99].includes(code)) return "weather_storm";
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchForecast(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&timezone=auto&forecast_days=3";
  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) throw new Error(`weather status ${res.status}`);
  return (await res.json()) as WeatherData;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  label: string;
}

export async function searchCity(query: string): Promise<GeocodingResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ja&format=json`;
  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) throw new Error(`geocoding status ${res.status}`);
  const data = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (data.results ?? []).map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(" / "),
  }));
}

export interface WeatherCache {
  lat: number;
  lon: number;
  data: WeatherData;
  fetchedAt: number;
}

export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

export type { WeatherLocation };
