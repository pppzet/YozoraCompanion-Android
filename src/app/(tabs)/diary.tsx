import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton, AppTextInput, Card, EmptyHint } from "@/components/ui/kit";
import { useTabBarClearance } from "@/components/ui/Screen";
import { deleteStoredImage, pickImage, resizeAndStore } from "@/lib/files";
import { pad2, todayKey } from "@/lib/format";
import * as repo from "@/lib/repo";
import { colors, fonts, radii } from "@/lib/theme";
import type { DiaryEntry } from "@/lib/types";
import { useCompanion } from "@/state/companion";
import { toastError } from "@/state/ui";

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useTabBarClearance();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const reload = useCallback(() => {
    try {
      setEntries(repo.getAllDiaryEntries());
    } catch (err) {
      toastError(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const attachImage = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      const uri = await resizeAndStore(picked, 1400, "diary");
      // 保存前に選び直したら前の一時画像は消す（編集元の画像は保持）
      if (pendingImage && pendingImage !== editing?.imageUri) await deleteStoredImage(pendingImage);
      setPendingImage(uri);
    } catch (err) {
      toastError(err);
    }
  };

  const clearPendingImage = async () => {
    if (pendingImage && pendingImage !== editing?.imageUri) await deleteStoredImage(pendingImage);
    setPendingImage(null);
  };

  const resetForm = () => {
    setText("");
    setPendingImage(null);
    setEditing(null);
  };

  const cancelEdit = async () => {
    if (pendingImage && pendingImage !== editing?.imageUri) await deleteStoredImage(pendingImage);
    resetForm();
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;
    try {
      if (editing) {
        if (editing.imageUri && editing.imageUri !== pendingImage) {
          void deleteStoredImage(editing.imageUri);
        }
        repo.updateDiaryEntry(editing.id, trimmed, pendingImage);
      } else {
        const now = new Date();
        repo.insertDiaryEntry({
          date: todayKey(),
          time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
          text: trimmed,
          imageUri: pendingImage,
        });
        useCompanion.getState().speak("diary_saved");
      }
      resetForm();
      reload();
    } catch (err) {
      toastError(err);
    }
  };

  const startEdit = (entry: DiaryEntry) => {
    setEditing(entry);
    setText(entry.text);
    setPendingImage(entry.imageUri);
  };

  const confirmDelete = (entry: DiaryEntry) => {
    Alert.alert("日記を削除", "この日記を削除する?元に戻せないよ。", [
      { text: "やめる", style: "cancel" },
      {
        text: "削除する",
        style: "destructive",
        onPress: () => {
          try {
            void deleteStoredImage(entry.imageUri);
            repo.deleteDiaryEntry(entry.id);
            if (editing?.id === entry.id) resetForm();
            reload();
          } catch (err) {
            toastError(err);
          }
        },
      },
    ]);
  };

  const form = (
    <Card>
      <AppTextInput
        multiline
        value={text}
        onChangeText={setText}
        placeholder="今日あったこと、気が向いたら少しだけ。"
      />
      <View style={styles.imageRow}>
        <AppButton title="📷 写真を添える" variant="tiny" onPress={() => void attachImage()} />
        {pendingImage ? (
          <View style={styles.preview}>
            <Image source={{ uri: pendingImage }} style={styles.previewImage} contentFit="cover" />
            <Pressable style={styles.previewClear} onPress={() => void clearPendingImage()} hitSlop={8}>
              <Text style={styles.previewClearText}>×</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.formActions}>
        <AppButton title={editing ? "更新する" : "保存する"} variant="primary" onPress={save} />
        {editing ? <AppButton title="キャンセル" onPress={() => void cancelEdit()} style={styles.cancelBtn} /> : null}
      </View>
    </Card>
  );

  return (
    <>
      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        style={styles.list}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: bottomClearance + 28,
          paddingHorizontal: 18,
        }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={form}
        ListEmptyComponent={<EmptyHint>まだ日記がないよ。今日のことを書いてみる?</EmptyHint>}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.meta}>
              {item.date} {item.time}
              {item.editedAt ? "（編集済み）" : ""}
            </Text>
            {item.imageUri ? (
              <Pressable onPress={() => setLightbox(item.imageUri)} accessibilityRole="imagebutton">
                <Image source={{ uri: item.imageUri }} style={styles.photo} contentFit="cover" />
              </Pressable>
            ) : null}
            <Text style={styles.text}>{item.text}</Text>
            <View style={styles.cardActions}>
              <AppButton title="編集" variant="tiny" onPress={() => startEdit(item)} />
              <AppButton title="削除" variant="dangerTiny" onPress={() => confirmDelete(item)} />
            </View>
          </Card>
        )}
      />

      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightbox} onPress={() => setLightbox(null)}>
          {lightbox ? <Image source={{ uri: lightbox }} style={styles.lightboxImage} contentFit="contain" /> : null}
          <Pressable style={[styles.lightboxClose, { top: insets.top + 16 }]} onPress={() => setLightbox(null)}>
            <Text style={styles.lightboxCloseText}>×</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  imageRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  preview: {
    position: "relative",
  },
  previewImage: {
    width: 110,
    height: 82,
    borderRadius: radii.input,
  },
  previewClear: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.nightMid,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  previewClearText: {
    color: colors.cream,
    fontSize: 13,
    lineHeight: 15,
  },
  formActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelBtn: {
    marginTop: 8,
  },
  meta: {
    fontSize: 11,
    color: colors.cream,
    opacity: 0.5,
    marginBottom: 6,
  },
  photo: {
    width: "100%",
    maxWidth: 220,
    height: 150,
    borderRadius: 12,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.cream,
    fontFamily: fonts.display,
    paddingRight: 84,
  },
  cardActions: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 6,
  },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(20,16,41,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lightboxImage: {
    width: "100%",
    height: "84%",
    borderRadius: 14,
  },
  lightboxClose: {
    position: "absolute",
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseText: {
    color: colors.cream,
    fontSize: 18,
    lineHeight: 20,
  },
});
