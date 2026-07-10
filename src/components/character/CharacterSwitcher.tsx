import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "@/lib/theme";
import { useCompanion } from "@/state/companion";

/** ホーム画面のキャラ切り替えサムネイル列 */
export function CharacterSwitcher() {
  const characters = useCompanion((s) => s.characters);
  const activeId = useCompanion((s) => s.activeCharacterId);
  const setActive = useCompanion((s) => s.setActiveCharacter);

  if (characters.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {characters.map((c) => {
        const thumb = c.images.normal ?? Object.values(c.images).find((u) => Boolean(u));
        const active = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setActive(c.id)}
            style={[styles.thumb, active && styles.thumbActive]}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}に切り替え`}
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <Text style={styles.thumbText}>{c.isPlaceholder ? "🌙" : c.name.charAt(0)}</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: 6,
    flexGrow: 0,
  },
  row: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.panelBgSoft,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbActive: {
    borderColor: colors.auroraTeal,
    shadowColor: colors.auroraTeal,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbText: {
    color: colors.cream,
    fontSize: 16,
  },
});
