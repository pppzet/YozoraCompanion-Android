import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton, AppTextInput, Card } from "@/components/ui/kit";
import { Screen } from "@/components/ui/Screen";
import { dateKey, todayKey } from "@/lib/format";
import * as repo from "@/lib/repo";
import { colors, fonts, radii } from "@/lib/theme";
import { useCompanion } from "@/state/companion";
import { toastError } from "@/state/ui";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
type CalCell = { key: string; day: number | null };

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const reload = useCallback(() => {
    try {
      const map: Record<string, string> = {};
      for (const e of repo.getAllCalendarEntries()) map[e.date] = e.text;
      setEntries(map);
    } catch (err) {
      toastError(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelected(null);
  };

  const openEditor = (key: string) => {
    setSelected(key);
    setDraft(entries[key] ?? "");
  };

  const closeEditor = () => setSelected(null);

  const save = () => {
    if (!selected) return;
    try {
      const text = draft.trim();
      if (text) {
        repo.upsertCalendarEntry(selected, text);
        useCompanion.getState().speak("schedule_prompt");
      } else {
        repo.deleteCalendarEntry(selected);
      }
      reload();
      closeEditor();
    } catch (err) {
      toastError(err);
    }
  };

  const remove = () => {
    if (!selected) return;
    try {
      repo.deleteCalendarEntry(selected);
      reload();
      closeEditor();
    } catch (err) {
      toastError(err);
    }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  const cells: CalCell[] = Array.from({ length: firstDay }, (_, i) => ({
    key: `blank-${i}`,
    day: null,
  }));
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: dateKey(year, month, d), day: d });
  // 最終週も必ず7マス分埋める（崩れ防止）
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, day: null });
  }
  // 7マスごとに「週の行」として分割する
  const weeks: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const renderCell = (cell: CalCell) => {
    if (cell.day === null) return <View key={cell.key} style={styles.cell} />;
    const isToday = cell.key === today;
    const hasNote = Boolean(entries[cell.key]);
    return (
      <View key={cell.key} style={styles.cell}>
        <Pressable
          style={[styles.day, isToday && styles.dayToday, selected === cell.key && styles.daySelected]}
          onPress={() => openEditor(cell.key)}
          accessibilityRole="button"
          accessibilityLabel={`${month + 1}月${cell.day}日`}
        >
          <Text style={styles.dayText}>{cell.day}</Text>
          {hasNote ? <View style={styles.noteDot} /> : null}
        </Pressable>
      </View>
    );
  };
  return (
    <Screen>
      <Card>
        <View style={styles.header}>
          <Pressable onPress={() => moveMonth(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="前の月">
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{`${year}年 ${month + 1}月`}</Text>
          <Pressable onPress={() => moveMonth(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="次の月">
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={styles.cell}>
                <Text style={styles.weekday}>{w}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={`week-${wi}`} style={styles.weekRow}>
              {week.map(renderCell)}
            </View>
          ))}
        </View>

        {selected ? (
          <View style={styles.editor}>
            <Text style={styles.editorTitle}>{selected}</Text>
            <AppTextInput
              multiline
              value={draft}
              onChangeText={setDraft}
              placeholder="予定を書いておく（空のまま保存すると削除されるよ）"
            />
            <View style={styles.editorActions}>
              <AppButton title="保存" variant="primary" onPress={save} />
              <AppButton title="削除" variant="danger" onPress={remove} style={styles.editorBtn} />
              <AppButton title="閉じる" onPress={closeEditor} style={styles.editorBtn} />
            </View>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navArrow: {
    color: colors.auroraTeal,
    fontSize: 22,
    paddingHorizontal: 10,
  },
  title: {
    color: colors.cream,
    fontSize: 15,
    letterSpacing: 1.5,
    fontFamily: fonts.display,
  },
  grid: {
    // 行(weekRow)ごとに描画するのでflexWrapは使わない
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    padding: 3,
  },
  weekday: {
    textAlign: "center",
    fontSize: 11,
    color: colors.cream,
    opacity: 0.5,
    paddingBottom: 4,
  },
  day: {
    aspectRatio: 1,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(245,239,227,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: {
    borderColor: colors.auroraTeal,
  },
  daySelected: {
    backgroundColor: "rgba(167,139,250,0.18)",
  },
  dayText: {
    color: colors.cream,
    fontSize: 13,
  },
  noteDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.auroraPink,
  },
  editor: {
    marginTop: 14,
  },
  editorTitle: {
    fontSize: 13,
    color: colors.cream,
    opacity: 0.7,
    marginBottom: 6,
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editorBtn: {
    marginTop: 8,
  },
});
