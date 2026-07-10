import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let player: AudioPlayer | null = null;
let configured = false;

/**
 * タイマー終了のチャイムを鳴らす。
 * 音源はWeb版のWebAudio合成音（880Hz→1046.5Hzの2音）を書き出したもの。
 */
export async function playChime(): Promise<void> {
  try {
    if (!configured) {
      configured = true;
      await setAudioModeAsync({ playsInSilentMode: true });
    }
    if (!player) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      player = createAudioPlayer(require("../../assets/audio/chime.wav"));
    }
    player.seekTo(0);
    player.play();
  } catch {
    // 音が鳴らせない環境では無視（Web版と同じ扱い）
  }
}
