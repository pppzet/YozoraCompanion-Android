import type { Category, Expression } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  greeting_morning: "朝の挨拶（5〜10時）",
  greeting_day: "昼の挨拶（10〜17時）",
  greeting_evening: "夕方の挨拶（17〜21時）",
  greeting_night: "夜の挨拶（21〜5時）",
  tap: "タップした時の反応",
  pomodoro_done: "タイマー終了時",
  diary_saved: "日記を書いた後",
  schedule_prompt: "予定を保存した後",
  weather_clear: "天気：晴れ",
  weather_cloudy: "天気：くもり",
  weather_rain: "天気：雨",
  weather_snow: "天気：雪",
  weather_storm: "天気：雷雨",
  weather_fog: "天気：霧",
};

export const GENERIC_FALLBACK: Record<Category, string[]> = {
  greeting_morning: ["おはよう。"],
  greeting_day: ["やあ。"],
  greeting_evening: ["お疲れさま。"],
  greeting_night: ["おやすみ、無理しないでね。"],
  tap: ["ん?", "そばにいるよ。"],
  pomodoro_done: ["お疲れさま。"],
  diary_saved: ["書いてくれてありがとう。"],
  schedule_prompt: ["書いておいたよ。"],
  weather_clear: ["いい天気だね。"],
  weather_cloudy: ["今日はくもり空だね。"],
  weather_rain: ["雨みたい。傘、忘れないでね。"],
  weather_snow: ["雪だって。あったかくしてね。"],
  weather_storm: ["雷が鳴るかも。気をつけてね。"],
  weather_fog: ["霧が出てるみたい。足元に気をつけて。"],
};

export const EXPRESSION_LABELS: Record<Expression, string> = {
  normal: "通常",
  smile: "笑顔",
  sleepy: "眠い",
  surprised: "びっくり",
  sad: "悲しい",
};

/** 初回起動時に「ルナ」へ登録されるサンプルセリフ */
export const SAMPLE_LINES: ReadonlyArray<readonly [Category, string, Expression | null]> = [
  ["greeting_morning", "おはよう。今日もゆっくりいこうね。", "smile"],
  ["greeting_morning", "よく眠れた?僕はここでずっと待ってたよ。", "normal"],
  ["greeting_morning", "朝の光、なんだか優しい色してるね。", "normal"],
  ["greeting_day", "今日はどんな一日にする?決めなくてもいいけど。", "normal"],
  ["greeting_day", "たまには僕の方も見てね。", "smile"],
  ["greeting_day", "何もしてなくても、ここにいるだけでえらいよ。", "smile"],
  ["greeting_evening", "お疲れさま。今日も一日、よく過ごしたね。", "smile"],
  ["greeting_evening", "夕方の空、一緒に眺めよう。", "normal"],
  ["greeting_evening", "そろそろひと息つく時間かな。", "sleepy"],
  ["greeting_night", "夜はゆっくり過ごそうね。", "sleepy"],
  ["greeting_night", "眠くなったら、無理せず休んでいいんだよ。", "sleepy"],
  ["greeting_night", "星が綺麗な夜だね。", "normal"],
  ["tap", "ん?どうしたの。", "normal"],
  ["tap", "そばにいるよ。", "smile"],
  ["tap", "何か話したいことある?", "normal"],
  ["tap", "今日はこのオーロラの色、好きだな。", "smile"],
  ["tap", "ちょっとくすぐったいよ、えへへ。", "smile"],
  ["tap", "ちょっと元気ない?無理しないでね。", "sad"],
  ["pomodoro_done", "お疲れさま、休憩しようか。", "smile"],
  ["pomodoro_done", "よく頑張ったね。少し休もう。", "smile"],
  ["diary_saved", "書いてくれてありがとう。読ませてもらうね。", "smile"],
  ["diary_saved", "今日の分、ちゃんと受け取ったよ。", "normal"],
  ["schedule_prompt", "予定、書いておいたよ。忘れても僕が持ってるから大丈夫。", "normal"],
  ["schedule_prompt", "何も書かなくても大丈夫だよ、また今度でいいから。", "normal"],
  ["weather_clear", "いい天気だね、日向ぼっこしたいな。", "smile"],
  ["weather_clear", "空が綺麗だよ、見てみて。", "smile"],
  ["weather_cloudy", "今日はくもり空だね。", "normal"],
  ["weather_cloudy", "のんびり過ごすのにちょうどいい空模様かも。", "normal"],
  ["weather_rain", "雨の音、なんだか落ち着くね。", "normal"],
  ["weather_rain", "傘、忘れないでね。", "normal"],
  ["weather_snow", "雪だ…!あったかくしてね。", "surprised"],
  ["weather_storm", "雷、大きな音がするかも。びっくりしないでね。", "surprised"],
  ["weather_fog", "霧が出てるね、足元に気をつけて。", "sad"],
];

/** 現在時刻から挨拶カテゴリを決める */
export function timeCategory(): Category {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "greeting_morning";
  if (h >= 10 && h < 17) return "greeting_day";
  if (h >= 17 && h < 21) return "greeting_evening";
  return "greeting_night";
}
