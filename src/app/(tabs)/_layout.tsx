import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, TAB_BAR_BASE_HEIGHT } from "@/lib/theme";

interface TabRoute {
  key: string;
  name: string;
}

interface NightTabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
  };
}

/** Web版の下タブと同じ、半透明の夜色タブバー */
function NightTabBar({ state, descriptors, navigation }: NightTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: TAB_BAR_BASE_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
          >
            <Text style={[styles.label, focused && styles.labelActive]}>{title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        animation: "fade",
      }}
      tabBar={(props) => <NightTabBar {...(props as unknown as NightTabBarProps)} />}
    >
      <Tabs.Screen name="index" options={{ title: "ホーム" }} />
      <Tabs.Screen name="calendar" options={{ title: "カレンダー" }} />
      <Tabs.Screen name="diary" options={{ title: "日記・メモ" }} />
      <Tabs.Screen name="chat" options={{ title: "おしゃべり" }} />
      <Tabs.Screen name="settings" options={{ title: "設定" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: colors.panelBg,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  label: {
    color: colors.cream,
    opacity: 0.5,
    fontSize: 12,
    letterSpacing: 1,
  },
  labelActive: {
    color: colors.auroraTeal,
    opacity: 1,
  },
});
