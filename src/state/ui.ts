import { create } from "zustand";
import * as repo from "@/lib/repo";

export interface BackgroundSettings {
  imageUri: string | null;
  overlayEnabled: boolean;
}

interface UiState {
  toast: string | null;
  clockFocus: boolean;
  timerCollapsed: boolean;
  weatherCollapsed: boolean;
  background: BackgroundSettings;

  initialize: () => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  toggleClockFocus: () => void;
  setTimerCollapsed: (collapsed: boolean) => void;
  setWeatherCollapsed: (collapsed: boolean) => void;
  setBackgroundImage: (uri: string | null) => void;
  setOverlayEnabled: (enabled: boolean) => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useUi = create<UiState>()((set, get) => ({
  toast: null,
  clockFocus: false,
  timerCollapsed: false,
  weatherCollapsed: true,
  background: { imageUri: null, overlayEnabled: true },

  initialize: () => {
    set({
      timerCollapsed: repo.metaGet<boolean>("timerPanelCollapsed") ?? false,
      weatherCollapsed: repo.metaGet<boolean>("weatherPanelCollapsed") ?? true,
      background: {
        imageUri: repo.metaGet<string>("customBackgroundUri"),
        overlayEnabled: repo.metaGet<boolean>("customBackgroundOverlay") ?? true,
      },
    });
  },

  showToast: (message) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: message });
    toastTimeout = setTimeout(() => set({ toast: null }), 6000);
  },

  hideToast: () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: null });
  },

  toggleClockFocus: () => set({ clockFocus: !get().clockFocus }),

  setTimerCollapsed: (collapsed) => {
    repo.metaSet("timerPanelCollapsed", collapsed);
    set({ timerCollapsed: collapsed });
  },

  setWeatherCollapsed: (collapsed) => {
    repo.metaSet("weatherPanelCollapsed", collapsed);
    set({ weatherCollapsed: collapsed });
  },

  setBackgroundImage: (uri) => {
    if (uri) {
      repo.metaSet("customBackgroundUri", uri);
    } else {
      repo.metaDelete("customBackgroundUri");
    }
    set({ background: { ...get().background, imageUri: uri } });
  },

  setOverlayEnabled: (enabled) => {
    repo.metaSet("customBackgroundOverlay", enabled);
    set({ background: { ...get().background, overlayEnabled: enabled } });
  },
}));

/** try/catch から呼ぶ、Web版のfriendlyMessageForError相当 */
export function toastError(err: unknown): void {
  const message =
    err instanceof Error && err.message.includes("Network")
      ? "通信がうまくいかなかったよ。ネット環境を確認してみてね。"
      : "ごめんね、うまくいかなかったみたい。もう一度試してみてね。";
  useUi.getState().showToast(message);
  console.warn("yozora error:", err);
}
