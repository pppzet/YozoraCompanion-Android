import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from "react-native";
import { colors, radii } from "@/lib/theme";

/** 半透明の紫パネル（Web版の .card） */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 設定画面などの見出し（Web版の .section-title） */
export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function EmptyHint({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.emptyHint, style]}>{children}</Text>;
}

type ButtonVariant = "primary" | "small" | "tiny" | "danger" | "dangerTiny";

export function AppButton({
  title,
  onPress,
  variant = "small",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const base =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "tiny" || variant === "dangerTiny"
        ? styles.btnTiny
        : styles.btnSmall;
  const danger = variant === "danger" || variant === "dangerTiny";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        base,
        danger && styles.btnDanger,
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
        style,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          variant === "primary" ? styles.btnPrimaryText : styles.btnText,
          danger && styles.btnDangerText,
          variant === "tiny" || variant === "dangerTiny" ? styles.btnTinyText : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** ダークテーマの入力欄 */
export function AppTextInput(props: TextInputProps) {
  const { style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor="rgba(245,239,227,0.4)"
      cursorColor={colors.auroraTeal}
      selectionColor={`${colors.auroraTeal}66`}
      {...rest}
      style={[styles.input, props.multiline ? styles.inputMultiline : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 3,
    color: colors.auroraViolet,
    opacity: 0.9,
    marginTop: 22,
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.cream,
    opacity: 0.55,
    lineHeight: 22,
  },
  btnPrimary: {
    backgroundColor: colors.auroraTeal,
    borderRadius: radii.button,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  btnPrimaryText: {
    color: colors.nightDeep,
    fontSize: 13,
    fontWeight: "600",
  },
  btnSmall: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.small,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  btnTiny: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.tiny,
    paddingVertical: 3,
    paddingHorizontal: 9,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  btnText: {
    color: colors.cream,
    fontSize: 12,
  },
  btnTinyText: {
    fontSize: 11,
  },
  btnDanger: {
    borderColor: "rgba(226,83,107,0.4)",
  },
  btnDangerText: {
    color: colors.accentRed,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPressed: {
    opacity: 0.7,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.input,
    color: colors.cream,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
    lineHeight: 21,
  },
});
