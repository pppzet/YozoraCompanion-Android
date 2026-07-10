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
  /** バックアップ復元の直前に呼ぶ。走行中のタイマーと通知予約を確実に止める。 */
  stopForRestore: () => void;
}

/** プロセス再起動をまたいで復元するための走行状態（metaに保存） */
interface TimerRunState {
  mode: TimerMode;
  phase: PomodoroPhase;
  running: boolean;
  endAt: number | null;
  remainingSec: number;
  elapsedBase: number;
  runningSince: number | null;
  notificationId: string | null;
}

function phaseDurationSec(settings: PomodoroSettings, phase: PomodoroPhase): number {
  return (phase === "work" ? settings.work : settings.break) * 60;
}

/** 走行状態をmetaへ書き出す（Androidにプロセスを落とされても復元できるように） */
function persistRunState(): void {
  const s = useTimer.getState();
  const runState: TimerRunState = {
    mode: s.mode,
    phase: s.phase,
    running: s.running,
    endAt: s.endAt,
    remainingSec: s.remainingSec,
    elapsedBase: s.elapsedBase,
    runningSince: s.runningSince,
    notificationId: s.notificationId,
  };
  repo.metaSet("timerRunState", runState);
}

/**
 * フェーズ終了通知を予約する。
 * 予約が終わるまでの間に一時停止・リセット・再スタートで状況が変わっていたら、
 * 古い予約を保存せずキャンセルする（新しい実行の通知IDを上書きしないため）。
 */
function armPhaseNotification(phase: PomodoroPhase, endAt: number): void {
  void (async () => {
    const id = await schedulePhaseEndNotification(phase, endAt);
    const s = useTimer.getState();
    if (s.running && s.endAt === endAt && s.phase === phase) {
      useTimer.setState({ notificationId: id });
      persistRunState();
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
    const settings = repo.metaGet<PomodoroSettings>("pomodoroSettings") ?? DEFAULT_POMODORO;
    const saved = repo.metaGet<TimerRunState>("timerRunState");
    if (!saved || typeof saved !== "object") {
      set({ settings, remainingSec: settings.work * 60 });
      return;
    }

    // アプリ再起動後も走行中のタイマーを引き継ぐ（追い付きは常駐tickが行う）
    const mode: TimerMode = saved.mode === "stopwatch" ? "stopwatch" : "pomodoro";
    const phase: PomodoroPhase = saved.phase === "break" ? "break" : "work";
    const endAt = typeof saved.endAt === "number" ? saved.endAt : null;
    const runningSince = typeof saved.runningSince === "number" ? saved.runningSince : null;
    const savedNotificationId = typeof saved.notificationId === "string" ? saved.notificationId : null;
    const running =
      saved.running === true &&
      ((mode === "pomodoro" && endAt !== null) || (mode === "stopwatch" && runningSince !== null));

    // 復元しない予約（停止中の残骸など）はOS側から消しておく
    const keepNotification = running && mode === "pomodoro";
    if (!keepNotification && savedNotificationId) {
      void cancelScheduledNotification(savedNotificationId);
    }

    set({
      settings,
      mode,
      phase,
      running,
      endAt: running && mode === "pomodoro" ? endAt : null,
      remainingSec: typeof saved.remainingSec === "number" ? saved.remainingSec : settings[phase] * 60,
      elapsedBase: typeof saved.elapsedBase === "number" ? saved.elapsedBase : 0,
      runningSince: running && mode === "stopwatch" ? runningSince : null,
      notificationId: keepNotification ? savedNotificationId : null,
    });
    persistRunState();
  },

  setMode: (mode) => {
    if (get().running) return;
    set({ mode });
    persistRunState();
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
      persistRunState();
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
    persistRunState();
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
    persistRunState();
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
    persistRunState();
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
    persistRunState();
    armPhaseNotification(phase, endAt);

    void playChime();
    useCompanion.getState().speak("pomodoro_done");
  },

  stopForRestore: () => {
    const s = get();
    void cancelScheduledNotification(s.notificationId);
    set({
      running: false,
      phase: "work",
      endAt: null,
      remainingSec: s.settings.work * 60,
      elapsedBase: 0,
      runningSince: null,
      notificationId: null,
    });
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
