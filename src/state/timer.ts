import { create } from "zustand";
import { playChime } from "@/lib/chime";
import { cancelScheduledNotification, schedulePhaseEndNotification } from "@/lib/notifications";
import * as repo from "@/lib/repo";
import { DEFAULT_POMODORO } from "@/lib/types";
import type { PomodoroSettings } from "@/lib/types";
import { useCompanion } from "./companion";

export type TimerMode = "pomodoro" | "stopwatch";
export type PomodoroPhase = "work" | "break";

interface TimerState {
  mode: TimerMode;
  phase: PomodoroPhase;
  running: boolean;
  settings: PomodoroSettings;
  /** ポモドーロ実行中：現フェーズが終わる時刻（epoch ms）。停止中はnull。 */
  endAt: number | null;
  /** ポモドーロ停止中の残り秒数 */
  remainingSec: number;
  /** ストップウォッチ：停止までの累計秒 */
  elapsedBase: number;
  /** ストップウォッチ実行中の開始時刻（epoch ms） */
  runningSince: number | null;
  notificationId: string | null;

  initialize: () => void;
  setMode: (mode: TimerMode) => void;
  toggle: () => void;
  reset: () => void;
  adjustSetting: (kind: keyof PomodoroSettings, delta: number) => void;
  /** 実行中に毎秒呼ばれ、フェーズ切り替えを処理する */
  tick: () => void;
}

function phaseDurationSec(settings: PomodoroSettings, phase: PomodoroPhase): number {
  return (phase === "work" ? settings.work : settings.break) * 60;
}

/** フェーズ終了通知を予約する。予約完了時に停止済みなら即キャンセル。 */
function armPhaseNotification(phase: PomodoroPhase, endAt: number): void {
  void (async () => {
    const id = await schedulePhaseEndNotification(phase, endAt);
    if (useTimer.getState().running) {
      useTimer.setState({ notificationId: id });
    } else {
      await cancelScheduledNotification(id);
    }
  })();
}

export const useTimer = create<TimerState>()((set, get) => ({
  mode: "pomodoro",
  phase: "work",
  running: false,
  settings: DEFAULT_POMODORO,
  endAt: null,
  remainingSec: DEFAULT_POMODORO.work * 60,
  elapsedBase: 0,
  runningSince: null,
  notificationId: null,

  initialize: () => {
    const stored = repo.metaGet<PomodoroSettings>("pomodoroSettings") ?? DEFAULT_POMODORO;
    set({ settings: stored, remainingSec: stored.work * 60 });
  },

  setMode: (mode) => {
    if (get().running) return;
    set({ mode });
  },

  toggle: () => {
    const s = get();
    if (s.running) {
      // 一時停止
      void cancelScheduledNotification(s.notificationId);
      if (s.mode === "pomodoro") {
        const remaining = Math.max(0, Math.round(((s.endAt ?? Date.now()) - Date.now()) / 1000));
        set({ running: false, endAt: null, remainingSec: remaining, notificationId: null });
      } else {
        const extra = s.runningSince ? (Date.now() - s.runningSince) / 1000 : 0;
        set({ running: false, runningSince: null, elapsedBase: s.elapsedBase + extra, notificationId: null });
      }
      return;
    }
    // 開始・再開
    if (s.mode === "pomodoro") {
      const endAt = Date.now() + s.remainingSec * 1000;
      set({ running: true, endAt });
      armPhaseNotification(s.phase, endAt);
    } else {
      set({ running: true, runningSince: Date.now() });
    }
  },

  reset: () => {
    const s = get();
    void cancelScheduledNotification(s.notificationId);
    if (s.mode === "pomodoro") {
      set({
        running: false,
        phase: "work",
        endAt: null,
        remainingSec: s.settings.work * 60,
        notificationId: null,
      });
    } else {
      set({ running: false, runningSince: null, elapsedBase: 0, notificationId: null });
    }
  },

  adjustSetting: (kind, delta) => {
    const s = get();
    const maxVal = kind === "work" ? 120 : 60;
    const val = Math.max(5, Math.min(maxVal, s.settings[kind] + delta));
    const settings = { ...s.settings, [kind]: val };
    repo.metaSet("pomodoroSettings", settings);
    const patch: Partial<TimerState> = { settings };
    // 停止中に現フェーズと同じ種類を変えたら残り時間も追従（Web版と同じ）
    if (s.mode === "pomodoro" && !s.running && s.phase === kind) {
      patch.remainingSec = val * 60;
    }
    set(patch);
  },

  tick: () => {
    const s = get();
    if (!s.running || s.mode !== "pomodoro" || s.endAt === null) return;
    const now = Date.now();
    if (now < s.endAt) return;

    // バックグラウンドで長時間経っていた場合も正しいフェーズまで送る
    let phase: PomodoroPhase = s.phase;
    let endAt = s.endAt;
    let flips = 0;
    while (endAt <= now) {
      phase = phase === "work" ? "break" : "work";
      endAt += phaseDurationSec(s.settings, phase) * 1000;
      flips += 1;
      if (flips > 200) break; // 念のための安全弁
    }

    void cancelScheduledNotification(s.notificationId);
    set({ phase, endAt, notificationId: null });
    armPhaseNotification(phase, endAt);

    void playChime();
    useCompanion.getState().speak("pomodoro_done");
  },
}));

/** 表示用の残り秒（ポモドーロ） */
export function pomodoroRemainingSec(s: Pick<TimerState, "running" | "endAt" | "remainingSec">): number {
  if (s.running && s.endAt !== null) {
    return Math.max(0, Math.round((s.endAt - Date.now()) / 1000));
  }
  return s.remainingSec;
}

/** 表示用の経過秒（ストップウォッチ） */
export function stopwatchElapsedSec(s: Pick<TimerState, "running" | "runningSince" | "elapsedBase">): number {
  const extra = s.running && s.runningSince !== null ? (Date.now() - s.runningSince) / 1000 : 0;
  return Math.floor(s.elapsedBase + extra);
}
