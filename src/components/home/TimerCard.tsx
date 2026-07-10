import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { clockText, formatTime } from "@/lib/format";
import { colors, radii } from "@/lib/theme";
import { pomodoroRemainingSec, stopwatchElapsedSec, useTimer } from "@/state/timer";
import { useUi } from "@/state/ui";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

/** ポモドーロ／ストップウォッチのカード。待機中は現在時刻を表示する。 */
export function TimerCard() {
  const collapsed = useUi((s) => s.timerCollapsed);
  const setCollapsed = useUi((s) => s.setTimerCollapsed);
  const timer = useTimer();
  const [, setPulse] = useState(0);

  // 表示の更新用パルス（フェーズ切り替え自体はルートレイアウトの常駐tickが担当）
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 500);
    return () => clearInterval(id);
  }, []);

  let display: string;
  let label: string;
  if (timer.running) {
    if (timer.mode === "pomodoro") {
      display = formatTime(pomodoroRemainingSec(timer));
      label = timer.phase === "work" ? "作業中" : "休憩中";
    } else {
      display = formatTime(stopwatchElapsedSec(timer));
      label = "経過時間";
    }
  } else {
    // 一時停止中は残り／経過を見せ、それ以外は現在時刻を刻む（Web版の待機時計）
    const pomodoroPaused = timer.mode === "pomodoro" && timer.remainingSec !== timer.settings[timer.phase] * 60;
    const stopwatchPaused = timer.mode === "stopwatch" && timer.elapsedBase > 0;
    if (pomodoroPaused) {
      display = formatTime(timer.remainingSec);
      label = "一時停止中";
    } else if (stopwatchPaused) {
      display = formatTime(timer.elapsedBase);
      label = "一時停止中";
    } else {
      display = clockText(new Date());
      label = "現在時刻";
    }
  }

  const onToggleRun = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timer.toggle();
  };

  return (
    <CollapsibleCard
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
      style={styles.card}
      header={<Text style={styles.headerText}>タイマー</Text>}
    >
      <View style={styles.modeRow}>
        {(
          [
            ["pomodoro", "ポモドーロ"],
            ["stopwatch", "ストップウォッチ"],
          ] as const
        ).map(([mode, label2]) => (
          <Pressable
            key={mode}
            style={[
              styles.modeBtn,
              timer.mode === mode && styles.modeBtnActive,
              timer.running && styles.modeBtnDisabled,
            ]}
            disabled={timer.running}
            onPress={() => timer.setMode(mode)}
            accessibilityRole="button"
          >
            <Text style={[styles.modeText, timer.mode === mode && styles.modeTextActive]}>{label2}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.display}>{display}</Text>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.controls}>
        <Pressable style={styles.startBtn} onPress={onToggleRun} accessibilityRole="button">
          <Text style={styles.startText}>{timer.running ? "一時停止" : "開始"}</Text>
        </Pressable>
        <Pressable style={styles.resetBtn} onPress={timer.reset} accessibilityRole="button">
          <Text style={styles.resetText}>リセット</Text>
        </Pressable>
      </View>
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 22,
  },
  headerText: {
    color: colors.cream,
    fontSize: 12,
    letterSpacing: 3,
    opacity: 0.8,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "rgba(167,139,250,0.18)",
    borderColor: colors.auroraViolet,
  },
  modeBtnDisabled: {
    opacity: 0.5,
  },
  modeText: {
    color: colors.cream,
    opacity: 0.6,
    fontSize: 13,
  },
  modeTextActive: {
    opacity: 1,
  },
  display: {
    textAlign: "center",
    fontSize: 44,
    letterSpacing: 1.5,
    color: colors.cream,
    fontVariant: ["tabular-nums"],
  },
  label: {
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 3,
    color: colors.cream,
    opacity: 0.6,
    marginBottom: 12,
  },
  controls: {
    flexDirection: "row",
    gap: 10,
  },
  startBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.auroraViolet,
    alignItems: "center",
  },
  startText: {
    color: colors.nightDeep,
    fontSize: 14,
    fontWeight: "600",
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
  },
  resetText: {
    color: colors.cream,
    fontSize: 14,
  },
});
