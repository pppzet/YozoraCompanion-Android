export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** 月は0始まり（Dateと同じ扱い）で YYYY-MM-DD を作る */
export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function todayKey(): string {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 秒数を MM:SS 表記へ */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${pad2(m)}:${pad2(s % 60)}`;
}

export function clockText(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/** 配列からランダムに1つ選ぶ（空配列はundefined） */
export function randomOf<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
