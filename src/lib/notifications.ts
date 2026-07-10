import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let prepared = false;

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

/** 通知チャンネルと権限を用意する（拒否されてもアプリ内チャイムは動く） */
async function prepare(): Promise<boolean> {
  try {
    if (!prepared) {
      prepared = true;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("timer", {
          name: "タイマー",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200],
          lightColor: "#a78bfa",
        });
      }
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** フェーズ終了時刻に通知を予約する。権限が無ければ静かに諦める。 */
export async function schedulePhaseEndNotification(phase: "work" | "break", endAt: number): Promise<string | null> {
  const granted = await prepare();
  if (!granted) return null;
  if (endAt - Date.now() < 1000) return null;
  try {
    const body = phase === "work" ? "作業おつかれさま。休憩しようか。" : "休憩おわり。ぼちぼち再開しようか。";
    return await Notifications.scheduleNotificationAsync({
      content: { title: "夜空のコンパニオン", body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endAt),
        channelId: "timer",
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 予約が既に消えている場合など
  }
}
