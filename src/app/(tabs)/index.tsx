import { Pressable, StyleSheet, Text } from "react-native";
import { CharacterStage } from "@/components/character/CharacterStage";
import { CharacterSwitcher } from "@/components/character/CharacterSwitcher";
import { SpeechBubble } from "@/components/character/SpeechBubble";
import { TimerCard } from "@/components/home/TimerCard";
import { WeatherCard } from "@/components/home/WeatherCard";
import { Screen } from "@/components/ui/Screen";
import { colors, fonts } from "@/lib/theme";
import { selectActiveCharacter, useCompanion } from "@/state/companion";
import { useUi } from "@/state/ui";

export default function HomeScreen() {
  const character = useCompanion(selectActiveCharacter);
  const expression = useCompanion((s) => s.expression);
  const clockFocus = useUi((s) => s.clockFocus);
  const toggleClockFocus = useUi((s) => s.toggleClockFocus);

  return (
    <Screen>
      <Text style={styles.charName}>{character?.name ?? "―"}</Text>
      <Pressable
        onPress={toggleClockFocus}
        style={[styles.clockFocusBtn, clockFocus && styles.clockFocusBtnActive]}
        accessibilityRole="button"
      >
        <Text style={[styles.clockFocusText, clockFocus && styles.clockFocusTextActive]}>
          {clockFocus ? "🐰 キャラを表示する" : "🌙 時計を大きく見る"}
        </Text>
      </Pressable>

      {!clockFocus && character ? (
        <>
          <CharacterStage character={character} expression={expression} />
          <SpeechBubble />
          <CharacterSwitcher />
          <WeatherCard />
          <TimerCard />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  charName: {
    textAlign: "center",
    fontSize: 15,
    letterSpacing: 2.5,
    color: colors.cream,
    opacity: 0.8,
    marginBottom: 6,
    fontFamily: fonts.display,
  },
  clockFocusBtn: {
    alignSelf: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    opacity: 0.75,
  },
  clockFocusBtnActive: {
    borderColor: colors.auroraTeal,
    opacity: 1,
  },
  clockFocusText: {
    color: colors.cream,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  clockFocusTextActive: {
    color: colors.auroraTeal,
  },
});
