import { create } from "zustand";
import { GENERIC_FALLBACK } from "@/lib/dialogue";
import { randomOf } from "@/lib/format";
import * as repo from "@/lib/repo";
import { EXPRESSIONS } from "@/lib/types";
import type { Category, Character, Expression, Line } from "@/lib/types";

export interface Speech {
  text: string;
  /** 同じ文言でも表示し直せるようにするためのキー */
  seq: number;
}

interface CompanionState {
  ready: boolean;
  characters: Character[];
  activeCharacterId: string;
  expression: Expression;
  speech: Speech | null;
  linesByCategory: Partial<Record<Category, Line[]>>;

  initialize: () => void;
  reloadCharacters: () => void;
  setActiveCharacter: (id: string) => void;
  addCharacter: (name: string) => void;
  removeCharacter: (id: string) => { removedImageUris: string[] } | null;
  setPersona: (persona: string) => void;
  setExpressionImage: (expression: Expression, uri: string) => string | null;
  clearExpressionImage: (expression: Expression) => string | null;
  addLine: (category: Category, text: string, expression: Expression | null) => void;
  removeLine: (id: number) => void;

  speak: (category: Category) => void;
  showSpeech: (text: string) => void;
  dismissSpeech: () => void;
}

function buildLinesCache(characterId: string): Partial<Record<Category, Line[]>> {
  const cache: Partial<Record<Category, Line[]>> = {};
  for (const line of repo.getLinesForCharacter(characterId)) {
    (cache[line.category] ??= []).push(line);
  }
  return cache;
}

export const useCompanion = create<CompanionState>()((set, get) => ({
  ready: false,
  characters: [],
  activeCharacterId: repo.SAMPLE_CHARACTER_ID,
  expression: "normal",
  speech: null,
  linesByCategory: {},

  initialize: () => {
    repo.seedIfNeeded();
    const characters = repo.getAllCharacters();
    const storedId = repo.metaGet<string>("activeCharacterId");
    const active = characters.find((c) => c.id === storedId) ?? characters[0];
    const activeId = active?.id ?? repo.SAMPLE_CHARACTER_ID;
    set({
      ready: true,
      characters,
      activeCharacterId: activeId,
      linesByCategory: buildLinesCache(activeId),
      expression: "normal",
    });
  },

  reloadCharacters: () => {
    const { activeCharacterId } = get();
    set({
      characters: repo.getAllCharacters(),
      linesByCategory: buildLinesCache(activeCharacterId),
    });
  },

  setActiveCharacter: (id) => {
    repo.metaSet("activeCharacterId", id);
    set({
      activeCharacterId: id,
      expression: "normal",
      linesByCategory: buildLinesCache(id),
      speech: null,
    });
  },

  addCharacter: (name) => {
    const id = `c-${Date.now()}`;
    repo.insertCharacter({ id, name, isPlaceholder: false });
    get().reloadCharacters();
  },

  removeCharacter: (id) => {
    const { characters, activeCharacterId } = get();
    if (characters.length <= 1) return null;
    const target = characters.find((c) => c.id === id);
    const removedImageUris = target ? Object.values(target.images).filter((u): u is string => Boolean(u)) : [];
    repo.deleteCharacter(id);
    const remaining = repo.getAllCharacters();
    const nextActive = activeCharacterId === id ? (remaining[0]?.id ?? activeCharacterId) : activeCharacterId;
    if (nextActive !== activeCharacterId) {
      repo.metaSet("activeCharacterId", nextActive);
    }
    set({
      characters: remaining,
      activeCharacterId: nextActive,
      expression: "normal",
      linesByCategory: buildLinesCache(nextActive),
    });
    return { removedImageUris };
  },

  setPersona: (persona) => {
    const { activeCharacterId } = get();
    repo.updatePersona(activeCharacterId, persona);
    get().reloadCharacters();
  },

  setExpressionImage: (expression, uri) => {
    const { activeCharacterId, characters } = get();
    const previous = characters.find((c) => c.id === activeCharacterId)?.images[expression] ?? null;
    repo.setCharacterImage(activeCharacterId, expression, uri);
    get().reloadCharacters();
    return previous;
  },

  clearExpressionImage: (expression) => {
    const { activeCharacterId, characters } = get();
    const previous = characters.find((c) => c.id === activeCharacterId)?.images[expression] ?? null;
    repo.deleteCharacterImage(activeCharacterId, expression);
    get().reloadCharacters();
    return previous;
  },

  addLine: (category, text, expression) => {
    const { activeCharacterId } = get();
    repo.insertLine({ characterId: activeCharacterId, category, text, expression });
    set({ linesByCategory: buildLinesCache(activeCharacterId) });
  },

  removeLine: (id) => {
    const { activeCharacterId } = get();
    repo.deleteLine(id);
    set({ linesByCategory: buildLinesCache(activeCharacterId) });
  },

  speak: (category) => {
    const { linesByCategory, characters, activeCharacterId, speech } = get();
    const lines = linesByCategory[category];
    const picked = lines && lines.length > 0 ? randomOf(lines) : undefined;
    const text = picked ? picked.text : (randomOf(GENERIC_FALLBACK[category]) ?? "");
    if (!text) return;

    const character = characters.find((c) => c.id === activeCharacterId);
    let expression: Expression | null = null;
    if (character) {
      // プレース（ルナ）は全表情が使える。画像キャラは登録済みの表情だけ。
      const available = EXPRESSIONS.filter((e) => character.isPlaceholder || Boolean(character.images[e]));
      const wanted = picked?.expression ?? null;
      if (wanted && available.includes(wanted)) {
        expression = wanted;
      } else if (available.length > 0) {
        expression = randomOf(available) ?? null;
      }
    }

    set({
      speech: { text, seq: (speech?.seq ?? 0) + 1 },
      ...(expression ? { expression } : {}),
    });
  },

  showSpeech: (text) => {
    if (!text) return;
    const { speech } = get();
    set({ speech: { text, seq: (speech?.seq ?? 0) + 1 } });
  },

  dismissSpeech: () => set({ speech: null }),
}));

/** 使用中のキャラクター（未ロード時はundefined） */
export function selectActiveCharacter(state: Pick<CompanionState, "characters" | "activeCharacterId">) {
  return state.characters.find((c) => c.id === state.activeCharacterId);
}
