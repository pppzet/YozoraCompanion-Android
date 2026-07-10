/** 夜空のコンパニオン デザイントークン（Web版のCSSカスタムプロパティを移植） */
export const colors = {
  nightDeep: "#141029",
  nightMid: "#1f1a3d",
  auroraTeal: "#6ee7c9",
  auroraViolet: "#a78bfa",
  auroraPink: "#e893c2",
  shadowPurple: "#8073a0",
  cream: "#f5efe3",
  accentRed: "#e2536b",
  panelBg: "rgba(31,26,61,0.72)",
  panelBgSoft: "rgba(31,26,61,0.45)",
  panelBorder: "rgba(245,239,227,0.14)",
  inputBg: "rgba(245,239,227,0.06)",
} as const;

export const fonts = {
  display: "ShipporiMincho_400Regular",
  displaySemiBold: "ShipporiMincho_600SemiBold",
} as const;

export const radii = {
  card: 16,
  panel: 18,
  input: 10,
  button: 10,
  small: 8,
  tiny: 6,
} as const;

export const TAB_BAR_BASE_HEIGHT = 56;
