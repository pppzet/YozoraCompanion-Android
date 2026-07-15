import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyHint } from "@/components/ui/kit";
import { AppTextInput } from "@/components/ui/kit";
import { useTabBarClearance } from "@/components/ui/Screen";
import { buildSystemText, callAi, getUserProfile } from "@/lib/ai";
import type { AiChatTurn } from "@/lib/ai";
import * as repo from "@/lib/repo";
import { colors, fonts, radii } from "@/lib/theme";
import type { ChatMessage } from "@/lib/types";
import { selectActiveCharacter, useCompanion } from "@/state/companion";
import { toastError } from "@/state/ui";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useTabBarClearance();
  const character = useCompanion(selectActiveCharacter);
  const linesByCategory = useCompanion((s) => s.linesByCategory);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const characterId = character?.id;

  const reload = useCallback(() => {
    if (!characterId) return;
    try {
      setMessages(repo.getChatHistory(characterId));
    } catch (err) {
      toastError(err);
    }
  }, [characterId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const avatarUri = character ? (character.images.normal ?? Object.values(character.images).find(Boolean)) : undefined;

  const send = async () => {
    const text = input.trim();
    if (!text || !character || sending) return;
    setSending(true);
    setInput("");
    setStatus("考え中…");
    try {
      const userMessageId = repo.insertChatMessage({
        characterId: character.id,
        role: "user",
        text,
        timestamp: Date.now(),
      });
      reload();

      // 口調の参考例（タップ・昼の挨拶の先頭セリフ）をシステムプロンプトへ
      const personaHints: string[] = [];
      for (const category of ["tap", "greeting_day"] as const) {
        const first = linesByCategory[category]?.[0];
        if (first) personaHints.push(first.text);
      }

      //　ユーザープロフィールも参照する
      const systemText = buildSystemText(character.name, character.persona, personaHints, getUserProfile());

      const history = repo.getChatHistory(character.id).slice(-16);
      const turns: AiChatTurn[] = history.map((m) => ({ role: m.role, text: m.text }));

      const result = await callAi(systemText, turns);
      // 返事を待つ間に会話が消されていたら、返信を書き戻さない
      if (!repo.chatMessageExists(userMessageId)) {
        setStatus("");
        reload();
        return;
      }
      if (result.ok) {
        repo.insertChatMessage({ characterId: character.id, role: "model", text: result.text, timestamp: Date.now() });
        reload();
        setStatus("");
      } else {
        setStatus(result.error);
      }
    } catch (err) {
      setStatus("");
      toastError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { marginTop: insets.top + 12 }]}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{character?.isPlaceholder ? "🌙" : (character?.name.charAt(0) ?? "")}</Text>
          )}
        </View>
        <Text style={styles.headerName}>{character?.name ?? "―"}</Text>
      </View>

      <FlatList
        data={inverted}
        inverted
        keyExtractor={(m) => String(m.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyHint style={styles.emptyHint}>まだ会話がないよ。下の欄から話しかけてみてね。</EmptyHint>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.role === "user" ? styles.msgRowUser : null]}>
            <View style={[styles.msg, item.role === "user" ? styles.msgUser : styles.msgModel]}>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.inputCard, { marginBottom: bottomClearance + 10 }]}>
        <AppTextInput
          multiline
          value={input}
          onChangeText={setInput}
          placeholder="キャラに話しかけてみる"
          editable={!sending}
          style={styles.input}
        />
        <View style={styles.inputRow}>
          <Pressable
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
            onPress={() => void send()}
            disabled={sending || !input.trim()}
            accessibilityRole="button"
          >
            <Text style={styles.sendText}>送信</Text>
          </Pressable>
          <Text style={styles.status} numberOfLines={2}>
            {status}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.panelBgSoft,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 18,
    color: colors.cream,
  },
  headerName: {
    color: colors.cream,
    fontSize: 14,
    opacity: 0.9,
    fontFamily: fonts.display,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  emptyHint: {
    textAlign: "center",
    paddingVertical: 20,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msg: {
    maxWidth: "78%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.card,
  },
  msgUser: {
    backgroundColor: "rgba(167,139,250,0.28)",
    borderBottomRightRadius: 4,
  },
  msgModel: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    color: colors.cream,
    fontSize: 14,
    lineHeight: 23,
    fontFamily: fonts.display,
  },
  inputCard: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.card,
    padding: 14,
    marginTop: 10,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  sendBtn: {
    backgroundColor: colors.auroraTeal,
    borderRadius: radii.button,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: colors.nightDeep,
    fontSize: 13,
    fontWeight: "600",
  },
  status: {
    flex: 1,
    fontSize: 12,
    color: colors.cream,
    opacity: 0.6,
    lineHeight: 17,
  },
});
