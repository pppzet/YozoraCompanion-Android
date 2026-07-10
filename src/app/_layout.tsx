import { ShipporiMincho_400Regular, ShipporiMincho_600SemiBold, useFonts } from "@expo-google-fonts/shippori-mincho";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AmbientClock } from "@/components/sky/AmbientClock";
import { NightSky } from "@/components/sky/NightSky";
import { Toast } from "@/components/ui/Toast";
import { timeCategory } from "@/lib/dialogue";
import { colors } from "@/lib/theme";
import { useCompanion } from "@/state/companion";
import { useTimer } from "@/state/timer";
import { toastError, useUi } from "@/state/ui";
import { useWeather } from "@/state/weather";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ShipporiMincho_400Regular, ShipporiMincho_600SemiBold });
  const [initialized, setInitialized] = useState(false);
  const { width, height } = useWindowDimensions();

  const ready = useCompanion((s) => s.ready);
  const clockFocus = useUi((s) => s.clockFocus);
  const background = useUi((s) => s.background);

  // データベースと各ストアの初期化（同期SQLiteなので一度だけ実行）
  useEffect(() => {
    try {
      useCompanion.getState().initialize();
      useUi.getState().initialize();
      useTimer.getState().initialize();
      useWeather.getState().initialize();
    } catch (err) {
      toastError(err);
    } finally {
      setInitialized(true);
    }
  }, []);

  // 起動から少し置いて時間帯の挨拶（Web版のsetTimeout 700ms）
  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => useCompanion.getState().speak(timeCategory()), 700);
    return () => clearTimeout(timeout);
  }, [ready]);

  // バックグラウンド復帰時：タイマーのフェーズを追い付かせ、天気キャッシュを見直す
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useTimer.getState().tick();
        void useWeather.getState().refresh(false);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && initialized) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  const clockSize = useMemo(() => Math.min(width * 0.7, height * 0.7), [width, height]);
  const showAmbient = !background.imageUri || background.overlayEnabled;

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: withTiming(clockFocus ? 0.85 : 0.55, { duration: 300 }),
  }));

  if (!fontsLoaded || !initialized) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <NightSky />
          {showAmbient ? (
            <Animated.View style={[StyleSheet.absoluteFill, ambientStyle]} pointerEvents="none">
              <AmbientClock size={clockSize} />
            </Animated.View>
          ) : null}
          <Slot />
          <Toast />
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.nightDeep,
  },
});
