import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/lib/theme";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** ダークテーマのドロップダウン（Web版の<select>相当） */
export function SelectField<T extends string>({
  options,
  value,
  onChange,
  placeholder = "選択してね",
}: {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.fieldText}>{selected?.label ?? placeholder}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.value === value && styles.optionActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.small,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldText: {
    color: colors.cream,
    fontSize: 13,
    flex: 1,
  },
  chevron: {
    color: colors.cream,
    opacity: 0.6,
    fontSize: 12,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,16,41,0.7)",
    justifyContent: "center",
    padding: 28,
  },
  sheet: {
    backgroundColor: colors.nightMid,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.card,
    maxHeight: "70%",
    overflow: "hidden",
  },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.panelBorder,
  },
  optionActive: {
    backgroundColor: "rgba(110,231,201,0.12)",
  },
  optionText: {
    color: colors.cream,
    fontSize: 14,
  },
  optionTextActive: {
    color: colors.auroraTeal,
  },
});
