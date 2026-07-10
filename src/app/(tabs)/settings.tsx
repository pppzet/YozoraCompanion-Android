import Constants from "expo-constants";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { AppButton, AppTextInput, Card, EmptyHint, SectionTitle } from "@/components/ui/kit";
import { Screen } from "@/components/ui/Screen";
import { SelectField } from "@/components/ui/SelectModal";
import type { SelectOption } from "@/components/ui/SelectModal";
import { getAiSettings, getApiKey, saveAiSettings, setApiKey } from "@/lib/ai";
import { exportBackup, pickBackupFile, restoreBackup } from "@/lib/backup";
import { CATEGORY_LABELS, EXPRESSION_LABELS } from "@/lib/dialogue";
import { deleteStoredImage, pickImage, resizeAndStore } from "@/lib/files";
import * as repo from "@/lib/repo";
import { colors, radii } from "@/lib/theme";
import { CATEGORIES, EXPRESSIONS } from "@/lib/types";
import type { AiProvider, Category, Expression } from "@/lib/types";
import { searchCity } from "@/lib/weather";
import type { GeocodingResult } from "@/lib/weather";
import { selectActiveCharacter, useCompanion } from "@/state/companion";
import { useTimer } from "@/state/timer";
import { toastError, useUi } from "@/state/ui";
import { useWeather } from "@/state/weather";

/* ---------------- キャラクター管理 ---------------- */

function CharactersSection() {
  const characters = useCompanion((s) => s.characters);
  const activeId = useCompanion((s) => s.activeCharacterId);
  const setActive = useCompanion((s) => s.setActiveCharacter);
  const addCharacter = useCompanion((s) => s.addCharacter);
  const removeCharacter = useCompanion((s) => s.removeCharacter);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");

  const confirmDelete = (id: string, charName: string) => {
    if (characters.length <= 1) {
      useUi.getState().showToast("最後の1人は削除できないよ。");
      return;
    }
    Alert.alert("キャラクターを削除", `${charName} を削除する?セリフも一緒に消えるよ。`, [
      { text: "やめる", style: "cancel" },
      {
        text: "削除する",
        style: "destructive",
        onPress: () => {
          try {
            const result = removeCharacter(id);
            for (const uri of result?.removedImageUris ?? []) void deleteStoredImage(uri);
          } catch (err) {
            toastError(err);
          }
        },
      },
    ]);
  };

  return (
    <>
      <SectionTitle>キャラクター</SectionTitle>
      <Card>
        {characters.map((c, i) => (
          <View key={c.id} style={[styles.row, i === characters.length - 1 && styles.rowLast]}>
            <Text style={styles.rowName} numberOfLines={1}>
              {c.name}
              {c.id === activeId ? "（使用中）" : ""}
            </Text>
            <View style={styles.rowButtons}>
              <AppButton title="使う" disabled={c.id === activeId} onPress={() => setActive(c.id)} />
              <AppButton title="削除" variant="danger" onPress={() => confirmDelete(c.id, c.name)} />
            </View>
          </View>
        ))}
        {formOpen ? (
          <View style={styles.addForm}>
            <AppTextInput value={name} onChangeText={setName} placeholder="キャラの名前" style={styles.addInput} />
            <AppButton
              title="追加"
              onPress={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                try {
                  addCharacter(trimmed);
                  setName("");
                  setFormOpen(false);
                } catch (err) {
                  toastError(err);
                }
              }}
            />
          </View>
        ) : null}
        <AppButton
          title={formOpen ? "閉じる" : "＋ 新しいキャラを追加"}
          onPress={() => setFormOpen(!formOpen)}
          style={styles.mt10}
        />
      </Card>
    </>
  );
}

/* ---------------- 表情画像 ---------------- */

function ExpressionsSection() {
  const character = useCompanion(selectActiveCharacter);
  const setExpressionImage = useCompanion((s) => s.setExpressionImage);
  const clearExpressionImage = useCompanion((s) => s.clearExpressionImage);

  if (!character) return null;

  const pick = async (expression: Expression) => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      const uri = await resizeAndStore(picked, 900, `char-${character.id}-${expression}`);
      const previous = setExpressionImage(expression, uri);
      if (previous) void deleteStoredImage(previous);
    } catch (err) {
      toastError(err);
    }
  };

  const clear = (expression: Expression) => {
    const previous = clearExpressionImage(expression);
    if (previous) void deleteStoredImage(previous);
  };

  return (
    <>
      <SectionTitle>表情画像（使用中のキャラ）</SectionTitle>
      <Card>
        {EXPRESSIONS.map((expression) => {
          const uri = character.images[expression];
          return (
            <View key={expression} style={styles.exprRow}>
              <Text style={styles.exprLabel}>{EXPRESSION_LABELS[expression]}</Text>
              <View style={styles.exprPreview}>
                {uri ? <Image source={{ uri }} style={styles.exprImage} contentFit="cover" /> : null}
              </View>
              <AppButton title="画像を選ぶ" variant="tiny" onPress={() => void pick(expression)} />
              {uri ? <AppButton title="×" variant="dangerTiny" onPress={() => clear(expression)} /> : null}
            </View>
          );
        })}
        <EmptyHint style={styles.mt8}>
          画像を登録しない表情はタップ時に自動で選ばれないよ。プレースキャラは絵なしでも表情が切り替わるよ。
        </EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- 性格・設定 ---------------- */

function PersonaSection() {
  const character = useCompanion(selectActiveCharacter);
  const setPersona = useCompanion((s) => s.setPersona);
  const [draft, setDraft] = useState(character?.persona ?? "");

  useEffect(() => {
    setDraft(character?.persona ?? "");
  }, [character?.id, character?.persona]);

  return (
    <>
      <SectionTitle>性格・設定（使用中のキャラ）</SectionTitle>
      <Card>
        <AppTextInput
          multiline
          value={draft}
          onChangeText={setDraft}
          style={styles.personaInput}
          placeholder="口調、性格、一人称、相手との関係性、話してほしいこと・してほしくないことなど、自由に書いてね。AIチャットの返信にそのまま反映されるよ。"
        />
        <AppButton
          title="保存"
          variant="primary"
          onPress={() => {
            try {
              setPersona(draft.trim());
              useUi.getState().showToast("保存したよ。");
            } catch (err) {
              toastError(err);
            }
          }}
        />
        <EmptyHint style={styles.mt8}>空のままだと、優しく穏やかな口調のデフォルト設定でおしゃべりするよ。</EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- セリフ ---------------- */

const CATEGORY_OPTIONS: SelectOption<Category>[] = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));
const EXPRESSION_OPTIONS: SelectOption<Expression | "auto">[] = [
  { value: "auto", label: "おまかせ（ランダム）" },
  ...EXPRESSIONS.map((e) => ({ value: e, label: EXPRESSION_LABELS[e] })),
];

function LinesSection() {
  const linesByCategory = useCompanion((s) => s.linesByCategory);
  const addLine = useCompanion((s) => s.addLine);
  const removeLine = useCompanion((s) => s.removeLine);
  const [category, setCategory] = useState<Category>("greeting_morning");
  const [text, setText] = useState("");
  const [expression, setExpression] = useState<Expression | "auto">("auto");

  const lines = linesByCategory[category] ?? [];

  return (
    <>
      <SectionTitle>セリフ</SectionTitle>
      <Card>
        <SelectField options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        <AppTextInput multiline value={text} onChangeText={setText} placeholder="セリフを入力してね" />
        <Text style={styles.fieldLabel}>この台詞の時の表情</Text>
        <SelectField options={EXPRESSION_OPTIONS} value={expression} onChange={setExpression} />
        <AppButton
          title="保存"
          variant="primary"
          onPress={() => {
            const trimmed = text.trim();
            if (!trimmed) return;
            try {
              addLine(category, trimmed, expression === "auto" ? null : expression);
              setText("");
              setExpression("auto");
            } catch (err) {
              toastError(err);
            }
          }}
        />
        <View style={styles.mt10}>
          {lines.length === 0 ? (
            <EmptyHint>まだセリフがないよ。上のフォームから追加してね。</EmptyHint>
          ) : (
            lines.map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <Text style={styles.lineText}>
                  {line.expression ? `[${EXPRESSION_LABELS[line.expression]}] ` : ""}
                  {line.text}
                </Text>
                <AppButton title="削除" variant="dangerTiny" onPress={() => removeLine(line.id)} />
              </View>
            ))
          )}
        </View>
      </Card>
      <EmptyHint>
        表情を選んでおくと、その台詞が話される時に表情も自動で連動するよ。「おまかせ」のままだと、登録済みの表情の中からランダムで選ばれるよ。
      </EmptyHint>
    </>
  );
}

/* ---------------- AIチャット ---------------- */

const PROVIDER_OPTIONS: SelectOption<AiProvider>[] = [
  { value: "gemini", label: "Gemini（Google AI Studio）" },
  { value: "openai", label: "OpenAI互換API（OpenAI / OpenRouter / ローカルLLMなど）" },
];

function AiSection() {
  const [settings, setSettings] = useState(getAiSettings);
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const activeId = useCompanion((s) => s.activeCharacterId);

  useEffect(() => {
    void getApiKey("gemini").then(setGeminiKey);
    void getApiKey("openai").then(setOpenaiKey);
  }, []);

  const save = async () => {
    try {
      const normalized = {
        ...settings,
        geminiModel: settings.geminiModel.trim() || "gemini-2.5-flash",
        openaiBaseUrl: settings.openaiBaseUrl.trim() || "https://api.openai.com/v1",
        openaiModel: settings.openaiModel.trim() || "gpt-4o-mini",
      };
      setSettings(normalized);
      saveAiSettings(normalized);
      await setApiKey("gemini", geminiKey.trim());
      await setApiKey("openai", openaiKey.trim());
      useUi.getState().showToast("保存したよ。");
    } catch (err) {
      toastError(err);
    }
  };

  const clearChat = () => {
    Alert.alert("会話履歴を削除", "使用中のキャラとの会話履歴を全部消す?元に戻せないよ。", [
      { text: "やめる", style: "cancel" },
      {
        text: "消す",
        style: "destructive",
        onPress: () => {
          try {
            repo.clearChatHistory(activeId);
            useUi.getState().showToast("会話履歴を消したよ。");
          } catch (err) {
            toastError(err);
          }
        },
      },
    ]);
  };

  return (
    <>
      <SectionTitle>AIチャット</SectionTitle>
      <Card>
        <Text style={styles.fieldLabel}>使うAI</Text>
        <SelectField
          options={PROVIDER_OPTIONS}
          value={settings.provider}
          onChange={(provider) => setSettings({ ...settings, provider })}
        />
        {settings.provider === "gemini" ? (
          <>
            <Text style={styles.fieldLabel}>Gemini APIキー</Text>
            <AppTextInput
              value={geminiKey}
              onChangeText={setGeminiKey}
              placeholder="APIキーを貼り付け"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>モデル</Text>
            <AppTextInput
              value={settings.geminiModel}
              onChangeText={(geminiModel) => setSettings({ ...settings, geminiModel })}
              placeholder="gemini-2.5-flash"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>ベースURL</Text>
            <AppTextInput
              value={settings.openaiBaseUrl}
              onChangeText={(openaiBaseUrl) => setSettings({ ...settings, openaiBaseUrl })}
              placeholder="https://api.openai.com/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.fieldLabel}>APIキー（不要なら空欄でOK）</Text>
            <AppTextInput
              value={openaiKey}
              onChangeText={setOpenaiKey}
              placeholder="APIキーを貼り付け"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>モデル</Text>
            <AppTextInput
              value={settings.openaiModel}
              onChangeText={(openaiModel) => setSettings({ ...settings, openaiModel })}
              placeholder="gpt-4o-mini"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}
        <AppButton title="保存" variant="primary" onPress={() => void save()} />
        <AppButton title="使用中のキャラとの会話を消す" variant="danger" onPress={clearChat} style={styles.mt10} />
        <EmptyHint style={styles.mt8}>
          キーはこの端末の安全な領域（Android
          Keystore）だけに保存されるよ。JSONバックアップには含まれないから、書き出したファイルを人に渡しても安心だよ。
        </EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- 天気 ---------------- */

function WeatherSection() {
  const location = useWeather((s) => s.location);
  const setLocation = useWeather((s) => s.setLocation);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  const useMyLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        useUi.getState().showToast("位置情報を取得できなかったよ。端末の位置情報の許可を確認してみてね。");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: position.coords.latitude, lon: position.coords.longitude, label: "現在地" });
      setResults([]);
    } catch (err) {
      toastError(err);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchMessage("検索中…");
    try {
      const found = await searchCity(q);
      setResults(found);
      setSearchMessage(found.length === 0 ? "見つからなかったよ。別の名前で試してみてね。" : "");
    } catch {
      setResults([]);
      setSearchMessage("検索できなかったよ。通信環境を確認してね。");
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <SectionTitle>天気</SectionTitle>
      <Card>
        <EmptyHint style={styles.mb10}>{location ? `設定中の場所：${location.label}` : "場所が未設定だよ"}</EmptyHint>
        <AppButton title="📍 現在地を使う" onPress={() => void useMyLocation()} />
        <View style={styles.searchRow}>
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="都市名で検索(例: 東京)"
            style={styles.searchInput}
            onSubmitEditing={() => void search()}
          />
          <AppButton title="検索" disabled={searching} onPress={() => void search()} />
        </View>
        {searchMessage ? <EmptyHint>{searchMessage}</EmptyHint> : null}
        {results.map((r) => (
          <AppButton
            key={`${r.latitude},${r.longitude}`}
            title={r.label}
            onPress={() => {
              setLocation({ lat: r.latitude, lon: r.longitude, label: r.label });
              setResults([]);
              setQuery("");
            }}
            style={styles.resultBtn}
          />
        ))}
        <EmptyHint style={styles.mt10}>
          Open-Meteoという無料の気象サービスを使っているよ。APIキーは不要だから、登録なしでそのまま使えるよ🌤️
        </EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- 背景 ---------------- */

function BackgroundSection() {
  const background = useUi((s) => s.background);
  const setBackgroundImage = useUi((s) => s.setBackgroundImage);
  const setOverlayEnabled = useUi((s) => s.setOverlayEnabled);

  const pick = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      const uri = await resizeAndStore(picked, 1600, "background");
      if (background.imageUri) void deleteStoredImage(background.imageUri);
      setBackgroundImage(uri);
    } catch (err) {
      toastError(err);
    }
  };

  const reset = () => {
    if (background.imageUri) void deleteStoredImage(background.imageUri);
    setBackgroundImage(null);
  };

  return (
    <>
      <SectionTitle>背景</SectionTitle>
      <Card>
        <View style={styles.bgPreview}>
          {background.imageUri ? (
            <Image source={{ uri: background.imageUri }} style={styles.bgPreviewImage} contentFit="cover" />
          ) : (
            <Text style={styles.bgPreviewText}>未設定（デフォルトの夜空）</Text>
          )}
        </View>
        <View style={styles.rowButtons}>
          <AppButton title="画像を選ぶ" onPress={() => void pick()} style={styles.mt10} />
          <AppButton title="デフォルトに戻す" variant="danger" onPress={reset} style={styles.mt10} />
        </View>
        <View style={styles.switchRow}>
          <Switch
            value={background.overlayEnabled}
            onValueChange={setOverlayEnabled}
            trackColor={{ false: "rgba(245,239,227,0.2)", true: `${colors.auroraTeal}88` }}
            thumbColor={background.overlayEnabled ? colors.auroraTeal : colors.cream}
          />
          <Text style={styles.switchLabel}>オーロラ・星・時計を重ねて表示する</Text>
        </View>
        <EmptyHint style={styles.mt8}>
          お気に入りの写真やイラストを背景にできるよ。大きな画像は自動で軽くしてから保存するね。
        </EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- ポモドーロ設定 ---------------- */

function PomodoroSection() {
  const settings = useTimer((s) => s.settings);
  const adjustSetting = useTimer((s) => s.adjustSetting);

  return (
    <>
      <SectionTitle>ポモドーロ設定（5分刻み）</SectionTitle>
      <Card>
        {(
          [
            ["work", "作業"],
            ["break", "休憩"],
          ] as const
        ).map(([kind, label]) => (
          <View key={kind} style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>{label}</Text>
            <AppButton title="－5" variant="tiny" onPress={() => adjustSetting(kind, -5)} />
            <Text style={styles.stepperValue}>{settings[kind]}分</Text>
            <AppButton title="＋5" variant="tiny" onPress={() => adjustSetting(kind, 5)} />
          </View>
        ))}
      </Card>
    </>
  );
}

/* ---------------- バックアップ ---------------- */

function BackupSection() {
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    try {
      const picked = await pickBackupFile();
      if (picked.status === "canceled") return;
      if (picked.status === "invalid") {
        useUi.getState().showToast("このアプリのバックアップファイルではないみたい。");
        return;
      }
      Alert.alert("バックアップから復元", "今のデータを置き換えて復元する?この操作は元に戻せないよ。", [
        { text: "やめる", style: "cancel" },
        {
          text: "復元する",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await restoreBackup(picked.payload);
                useCompanion.getState().initialize();
                useUi.getState().initialize();
                useTimer.getState().initialize();
                useWeather.getState().initialize();
                useUi.getState().showToast("復元したよ。");
              } catch (err) {
                toastError(err);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <SectionTitle>バックアップ</SectionTitle>
      <Card>
        <AppButton title="JSONで書き出す" variant="primary" disabled={busy} onPress={() => void doExport()} />
        <EmptyHint style={styles.mt10}>別のスマホや、リセット後に復元したいときはこちら👇</EmptyHint>
        <AppButton title="JSONファイルを読み込む" disabled={busy} onPress={() => void doImport()} style={styles.mt8} />
        <EmptyHint style={styles.mt8}>
          Web版「夜空のコンパニオン」で書き出したJSONもそのまま読み込めるよ。復元すると今のデータは置き換わるから気をつけてね。
        </EmptyHint>
      </Card>
    </>
  );
}

/* ---------------- 画面全体 ---------------- */

export default function SettingsScreen() {
  return (
    <Screen>
      <CharactersSection />
      <ExpressionsSection />
      <PersonaSection />
      <LinesSection />
      <AiSection />
      <WeatherSection />
      <BackgroundSection />
      <PomodoroSection />
      <BackupSection />
      <EmptyHint style={styles.footer}>
        夜空のコンパニオン v{Constants.expoConfig?.version ?? "?"}（pppzet/YozoraCompanion のAndroid移植版）
      </EmptyHint>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
    gap: 8,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowName: {
    flex: 1,
    color: colors.cream,
    fontSize: 14,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 6,
  },
  addForm: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  addInput: {
    flex: 1,
    marginBottom: 0,
  },
  mt8: {
    marginTop: 8,
  },
  mt10: {
    marginTop: 10,
  },
  mb10: {
    marginBottom: 10,
  },
  exprRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  exprLabel: {
    width: 56,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.75,
  },
  exprPreview: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.panelBorder,
    overflow: "hidden",
  },
  exprImage: {
    width: "100%",
    height: "100%",
  },
  personaInput: {
    minHeight: 110,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.cream,
    opacity: 0.7,
    marginBottom: 6,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  lineText: {
    flex: 1,
    color: colors.cream,
    fontSize: 13,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  resultBtn: {
    marginTop: 6,
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  bgPreview: {
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bgPreviewImage: {
    width: "100%",
    height: "100%",
  },
  bgPreviewText: {
    fontSize: 12,
    color: colors.cream,
    opacity: 0.6,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.85,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  stepperLabel: {
    width: 38,
    fontSize: 13,
    color: colors.cream,
    opacity: 0.75,
  },
  stepperValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: colors.cream,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 11,
  },
});
