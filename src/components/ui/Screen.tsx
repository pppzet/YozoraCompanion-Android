import { ScrollView, StyleSheet } from "react-native";
import type { ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "@/lib/theme";

/** タブバーとステータスバーを避けて中身をスクロールさせる共通ラッパー */
export function Screen({ children, ...rest }: ScrollViewProps & { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      {...rest}
      contentContainerStyle={[
        {
          paddingTop: insets.top + 16,
          paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 28,
          paddingHorizontal: 18,
        },
        rest.contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
});
