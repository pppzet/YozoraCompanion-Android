import { BlurMask, Canvas, Oval, rect } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { colors } from "@/lib/theme";
import type { Character, Expression } from "@/lib/types";
import { useCompanion } from "@/state/companion";
import { LunaSkia } from "./LunaSkia";

function GroundShadow({ width }: { width: number }) {
  const w = width * 0.55;
  return (
    <Canvas style={{ position: "absolute", bottom: "6%", width: w, height: 20, alignSelf: "center" }}>
      <Oval rect={rect(w * 0.1, 4, w * 0.8, 13)} color={colors.shadowPurple} opacity={0.4}>
        <BlurMask blur={7} style="normal" />
      </Oval>
    </Canvas>
  );
}

/** タップで反応するキャラクター表示。画像 → ルナ → 未設定案内 の順で出し分ける。 */
export function CharacterStage({ character, expression }: { character: Character; expression: Expression }) {
  const { height: windowHeight } = useWindowDimensions();
  const speak = useCompanion((s) => s.speak);
  const bounce = useSharedValue(1);

  const stageHeight = Math.max(220, windowHeight * 0.38);

  const onTap = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speak("tap");
    // Web版の charBounce（1 → 1.07 → 0.97 → 1）
    bounce.value = withSequence(
      withTiming(1.07, { duration: 120 }),
      withTiming(0.97, { duration: 120 }),
      withTiming(1, { duration: 160 }),
    );
  };

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));

  const uploadedUri = character.images[expression];
  const anyImageUri = character.images.normal ?? Object.values(character.images).find((u) => Boolean(u));
  const showLuna = !uploadedUri && character.isPlaceholder;
  const fallbackUri = !uploadedUri && !character.isPlaceholder ? anyImageUri : undefined;
  const displayUri = uploadedUri ?? fallbackUri;

  return (
    <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel={`${character.name}にさわる`}>
      <View style={[styles.stage, { height: stageHeight }]}>
        {displayUri ? (
          <>
            <GroundShadow width={Math.min(320, stageHeight)} />
            <Animated.View style={[styles.imageWrap, bounceStyle]}>
              <Image source={{ uri: displayUri }} style={styles.image} contentFit="contain" transition={150} />
            </Animated.View>
          </>
        ) : showLuna ? (
          <Animated.View style={[styles.lunaWrap, bounceStyle]}>
            <LunaSkia width={stageHeight * 0.82} height={stageHeight * 0.92} expression={expression} />
          </Animated.View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>画像が未設定だよ。{"\n"}「設定」タブから表情画像を登録してね。</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  imageWrap: {
    width: "80%",
    height: "92%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  lunaWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  empty: {
    width: "70%",
    height: "70%",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.panelBorder,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginBottom: "8%",
  },
  emptyText: {
    fontSize: 13,
    color: colors.cream,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 21,
  },
});
