import { create } from "zustand";
import { todayKey } from "@/lib/format";
import * as repo from "@/lib/repo";
import { fetchForecast, weatherCategory, WEATHER_CACHE_TTL_MS } from "@/lib/weather";
import type { WeatherCache } from "@/lib/weather";
import type { WeatherData, WeatherLocation } from "@/lib/types";
import { useCompanion } from "./companion";

interface WeatherState {
  location: WeatherLocation | null;
  data: WeatherData | null;
  status: "idle" | "loading" | "error" | "ready";
  lastCode: number | null;

  initialize: () => void;
  setLocation: (loc: WeatherLocation) => void;
  refresh: (force: boolean) => Promise<void>;
  /** 1日1回だけ、その日の天気をしゃべる */
  maybeSpeakDaily: () => void;
  /** カード展開・更新時に天気をしゃべる */
  speakNow: () => void;
}

export const useWeather = create<WeatherState>()((set, get) => ({
  location: null,
  data: null,
  status: "idle",
  lastCode: null,

  initialize: () => {
    const location = repo.metaGet<WeatherLocation>("weatherLocation");
    // バックアップ復元後の再初期化でも前の予報が残らないように、毎回まっさらにする
    set({ location, data: null, lastCode: null, status: location ? "loading" : "idle" });
    if (location) {
      void get().refresh(false);
    }
  },

  setLocation: (loc) => {
    repo.metaSet("weatherLocation", loc);
    // 新しい場所のラベルに前の場所の予報を組み合わせて見せない（しゃべる内容も同様）
    set({ location: loc, data: null, lastCode: null, status: "loading" });
    void get().refresh(true);
  },

  refresh: async (force) => {
    const { location } = get();
    if (!location) return;
    if (!force) {
      const cache = repo.metaGet<WeatherCache>("weatherCache");
      if (
        cache &&
        cache.lat === location.lat &&
        cache.lon === location.lon &&
        Date.now() - cache.fetchedAt < WEATHER_CACHE_TTL_MS
      ) {
        set({ data: cache.data, status: "ready", lastCode: cache.data.current.weather_code });
        get().maybeSpeakDaily();
        return;
      }
    }
    set({ status: "loading" });
    // 取得中に別の場所へ切り替わっていたら、この応答は捨てる
    const isStale = () => {
      const current = get().location;
      return !current || current.lat !== location.lat || current.lon !== location.lon;
    };
    try {
      const data = await fetchForecast(location.lat, location.lon);
      if (isStale()) return;
      const cache: WeatherCache = { lat: location.lat, lon: location.lon, data, fetchedAt: Date.now() };
      repo.metaSet("weatherCache", cache);
      set({ data, status: "ready", lastCode: data.current.weather_code });
      get().maybeSpeakDaily();
    } catch {
      if (isStale()) return;
      set({ status: "error" });
    }
  },

  maybeSpeakDaily: () => {
    const { lastCode } = get();
    if (lastCode === null) return;
    const category = weatherCategory(lastCode);
    if (!category) return;
    const today = todayKey();
    if (repo.metaGet<string>("lastWeatherSpeechDate") === today) return;
    repo.metaSet("lastWeatherSpeechDate", today);
    useCompanion.getState().speak(category);
  },

  speakNow: () => {
    const { lastCode } = get();
    if (lastCode === null) return;
    const category = weatherCategory(lastCode);
    if (!category) return;
    useCompanion.getState().speak(category);
  },
}));
