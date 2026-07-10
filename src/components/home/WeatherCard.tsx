import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { weatherCodeInfo } from "@/lib/weather";
import { colors } from "@/lib/theme";
import { useUi } from "@/state/ui";
import { useWeather } from "@/state/weather";
import { AppButton } from "@/components/ui/kit";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** ホームの天気カード（Open-Meteo・今日+2日分） */
export function WeatherCard() {
  const collapsed = useUi((s) => s.weatherCollapsed);
  const setCollapsed = useUi((s) => s.setWeatherCollapsed);
  const { location, data, status, speakNow, refresh } = useWeather();
  const [refreshing, setRefreshing] = useState(false);

  const headerText = (() => {
    if (!location) return "設定タブで場所を登録してね";
    if (status === "error") return "天気を取得できなかったよ（通信エラー）";
    if (!data) return "天気を読み込み中…";
    const [icon, desc] = weatherCodeInfo(data.current.weather_code);
    return `${icon} ${Math.round(data.current.temperature_2m)}° ${desc}`;
  })();

  const onToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (!next) speakNow();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh(true);
    setRefreshing(false);
    speakNow();
  };

  return (
    <CollapsibleCard
      collapsed={collapsed}
      onToggle={onToggle}
      style={styles.card}
      header={
        <View style={styles.headerRow}>
          <Text style={styles.headerText} numberOfLines={1}>
            {headerText}
            {location && data ? <Text style={styles.headerLoc}>{`  ${location.label}`}</Text> : null}
          </Text>
        </View>
      }
    >
      {data ? (
        <View style={styles.days}>
          {data.daily.time.map((day, i) => {
            const [icon] = weatherCodeInfo(data.daily.weather_code[i] ?? -1);
            const max = Math.round(data.daily.temperature_2m_max[i] ?? 0);
            const min = Math.round(data.daily.temperature_2m_min[i] ?? 0);
            const dow = WEEKDAYS[new Date(day).getDay()] ?? "";
            return (
              <View key={day} style={styles.day}>
                <Text style={styles.dayLabel}>{i === 0 ? "今日" : dow}</Text>
                <Text style={styles.dayIcon}>{icon}</Text>
                <Text style={styles.dayTemp}>{`${max}° / ${min}°`}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <AppButton
        title={refreshing ? "更新中…" : "更新する"}
        variant="tiny"
        disabled={refreshing || !location}
        onPress={() => void onRefresh()}
        style={styles.refresh}
      />
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    color: colors.cream,
    fontSize: 13,
    flex: 1,
  },
  headerLoc: {
    fontSize: 11,
    opacity: 0.55,
  },
  days: {
    flexDirection: "row",
    gap: 8,
  },
  day: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    color: colors.cream,
    fontSize: 11,
    opacity: 0.85,
  },
  dayIcon: {
    fontSize: 18,
    marginVertical: 2,
  },
  dayTemp: {
    color: colors.cream,
    fontSize: 11,
    opacity: 0.85,
    fontVariant: ["tabular-nums"],
  },
  refresh: {
    marginTop: 10,
  },
});
