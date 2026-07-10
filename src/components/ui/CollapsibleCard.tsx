import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, radii } from "@/lib/theme";

/** ヘッダーをタップして開閉できるパネル（天気・タイマーカード用） */
export function CollapsibleCard({
  header,
  collapsed,
  onToggle,
  children,
  style,
}: {
  header: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      <Pressable style={styles.header} onPress={onToggle} accessibilityRole="button">
        <View style={styles.headerContent}>{header}</View>
        <Text style={[styles.chevron, collapsed && styles.chevronCollapsed]}>▾</Text>
      </Pressable>
      {collapsed ? null : <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.panel,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flex: 1,
  },
  chevron: {
    color: colors.cream,
    opacity: 0.8,
    fontSize: 13,
    marginLeft: 8,
  },
  chevronCollapsed: {
    transform: [{ rotate: "-90deg" }],
  },
  body: {
    marginTop: 12,
  },
});
