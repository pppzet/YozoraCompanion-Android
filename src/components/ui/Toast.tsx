import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "@/lib/theme";
import { useUi } from "@/state/ui";

/** 画面上部にそっと出るエラートースト（Web版の .error-toast） */
export function Toast() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  return (
    <View style={[styles.holder, { top: insets.top + 14 }]} pointerEvents="box-none">
      <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(250)} style={styles.toast}>
        <Text style={styles.icon}>🌙</Text>
        <Text style={styles.text}>{toast}</Text>
        <Pressable onPress={hide} hitSlop={8} accessibilityRole="button" accessibilityLabel="閉じる">
          <Text style={styles.close}>×</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 200,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: 420,
    backgroundColor: colors.nightMid,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    color: colors.cream,
    opacity: 0.92,
    fontSize: 13,
    lineHeight: 21,
  },
  close: {
    color: colors.cream,
    opacity: 0.6,
    fontSize: 18,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
});
