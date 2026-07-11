import { Directory, File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

function imageDir(): Directory {
  return new Directory(Paths.document, "images");
}

function ensureImageDir(): Directory {
  const dir = imageDir();
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** フォトライブラリから画像を1枚選ぶ（キャンセル時はnull） */
export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * 長辺がmaxSizeに収まるよう縮小してJPEG保存し、アプリ専用領域の永続URIを返す。
 * Web版のresizeImageFile（キャラ900 / 日記1400 / 背景1600）に対応する。
 */
export async function resizeAndStore(picked: PickedImage, maxSize: number, name: string): Promise<string> {
  const dir = ensureImageDir();
  const { width, height } = picked;
  const actions: { resize: { width: number } | { height: number } }[] = [];
  if (width > maxSize || height > maxSize) {
    actions.push(width >= height ? { resize: { width: maxSize } } : { resize: { height: maxSize } });
  }
 const isPng = picked.uri.toLowerCase().endsWith(".png");
 const format = isPng ? SaveFormat.PNG : SaveFormat.JPEG;
 const manipulated = await manipulateAsync(picked.uri, actions, {
  compress: isPng ? 1 : 0.85,
  format,
});
const dest = new File(dir, `${name}-${Date.now()}.${isPng ? "png" : "jpg"}`);
  new File(manipulated.uri).move(dest);
  return dest.uri;
}

/** base64のデータURLを画像ファイルとして保存して永続URIを返す（バックアップ復元用） */
export async function storeDataUrl(dataUrl: string, name: string): Promise<string | null> {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const ext = match[1] === "png" ? "png" : "jpg";
  const base64 = match[2] ?? "";
  const dir = ensureImageDir();
  const dest = new File(dir, `${name}-${Date.now()}.${ext}`);
  dest.write(base64, { encoding: "base64" });
  return dest.uri;
}

/** 画像ファイルをbase64データURLとして読む（バックアップ書き出し用） */
export async function readAsDataUrl(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    const base64 = await file.base64();
    const mime = uri.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/** アプリが保存した画像ファイルを消す（存在しなくてもエラーにしない） */
export async function deleteStoredImage(uri: string | null | undefined): Promise<void> {
  if (!uri || !uri.startsWith(imageDir().uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 消せなくても致命的ではない
  }
}

/** 復元前に画像ディレクトリを空にする */
export async function clearImageDir(): Promise<void> {
  try {
    const dir = imageDir();
    if (dir.exists) dir.delete();
  } catch {
    // ディレクトリが無い場合など
  }
  ensureImageDir();
}

export async function writeTextFile(name: string, content: string): Promise<string> {
  const file = new File(Paths.cache, name);
  file.write(content);
  return file.uri;
}

export async function readTextFile(uri: string): Promise<string> {
  return new File(uri).text();
}
