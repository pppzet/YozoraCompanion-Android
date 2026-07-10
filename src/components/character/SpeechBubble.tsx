import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createAnimatedComponent, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors } from "@/lib/theme";
import { useCompanion } from "@/state/companion";

const AnimatedPressable = createAnimatedComponent(Pressable);

/** キャラの下に出る吹き出し。5秒で消え、タップでも閉じられる。 */
export function SpeechBubble() {
  const speech = useCompanion((s) => s.speech);
  const dismiss = useCompanion((s) => s.dismissSpeech);
  const visible = useSharedValue(0);

  useEffect(() => {
    if (!speech) {
      visible.value = withTiming(0, { duration: 250 });
      return;
    }
    visible.value = withTiming(1, { duration: 250 });
    const timeout = setTimeout(() => {
      visible.value = withTiming(0, { duration: 250 });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [speech, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - visible.value) * 6 }, { scale: 0.96 + visible.value * 0.04 }],
  }));

  return (
    <View style={styles.holder} pointerEvents="box-none">
      <AnimatedPressable
        style={[styles.bubble, style]}
        onPress={dismiss}
        pointerEvents={speech ? "auto" : "none"}
        accessibilityRole="text"
      >
        <View style={styles.tail} />
        <Text style={styles.text}>{speech?.text ?? ""}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: {
    minHeight: 58,
    marginTop: 14,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: 280,
    backgroundColor: colors.cream,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: colors.auroraViolet,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tail: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.cream,
  },
  text: {
    color: colors.nightDeep,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
