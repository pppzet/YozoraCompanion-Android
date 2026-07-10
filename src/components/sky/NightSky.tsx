import { Canvas, Circle, Group, Line, RadialGradient, Rect, vec } from "@shopify/react-native-skia";
import { useClock } from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { colors } from "@/lib/theme";
import { useUi } from "@/state/ui";

interface Star {
  id: string;
  x: number;
  y: number;
  r: number;
  phase: number;
  durationMs: number;
}

function makeStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: `star-${i}`,
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 2 + 0.6) / 2 + 0.4,
      phase: Math.random() * Math.PI * 2,
      durationMs: (3 + Math.random() * 3) * 1000,
    });
  }
  return stars;
}

function TwinkleStar({ star, clock }: { star: Star; clock: SharedValue<number> }) {
  const opacity = useDerivedValue(() => {
    const t = (clock.value / star.durationMs) * Math.PI * 2 + star.phase;
    // 0.15〜0.85 の間でまたたく（Web版のtwinkleと同じ振れ幅）
    return 0.5 + 0.35 * Math.sin(t);
  });
  return <Circle cx={star.x} cy={star.y} r={star.r} color={colors.cream} opacity={opacity} />;
}

/** ときどき夜空を流れる星（Web版には無いお楽しみ） */
function ShootingStar({ clock, width, height }: { clock: SharedValue<number>; width: number; height: number }) {
  const PERIOD = 23000;
  const ACTIVE = 1300;

  const head = useDerivedValue(() => {
    const cycle = Math.floor(clock.value / PERIOD);
    const t = clock.value % PERIOD;
    const rand = Math.abs(Math.sin(cycle * 12.9898) * 43758.5453) % 1;
    const rand2 = Math.abs(Math.sin(cycle * 78.233) * 12543.2971) % 1;
    const progress = Math.min(1, t / ACTIVE);
    const startX = width * (0.15 + rand * 0.7);
    const startY = height * (0.06 + rand2 * 0.22);
    const dx = (rand > 0.5 ? 1 : -1) * width * 0.5;
    const dy = height * 0.28;
    return { x: startX + dx * progress, y: startY + dy * progress };
  });
  const tail = useDerivedValue(() => {
    const cycle = Math.floor(clock.value / PERIOD);
    const t = clock.value % PERIOD;
    const rand = Math.abs(Math.sin(cycle * 12.9898) * 43758.5453) % 1;
    const rand2 = Math.abs(Math.sin(cycle * 78.233) * 12543.2971) % 1;
    const progress = Math.min(1, t / ACTIVE);
    const startX = width * (0.15 + rand * 0.7);
    const startY = height * (0.06 + rand2 * 0.22);
    const dx = (rand > 0.5 ? 1 : -1) * width * 0.5;
    const dy = height * 0.28;
    const tailLag = 0.16;
    const p2 = Math.max(0, progress - tailLag);
    return { x: startX + dx * p2, y: startY + dy * p2 };
  });
  const opacity = useDerivedValue(() => {
    const t = clock.value % PERIOD;
    if (t > ACTIVE) return 0;
    const progress = t / ACTIVE;
    return Math.sin(progress * Math.PI) * 0.8;
  });

  return <Line p1={head} p2={tail} color={colors.cream} strokeWidth={1.6} opacity={opacity} />;
}

function AuroraBlob({
  cx,
  cy,
  r,
  color,
  clock,
  driftScale,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  clock: SharedValue<number>;
  driftScale: number;
}) {
  const transform = useDerivedValue(() => {
    // 22秒周期でゆっくり往復するドリフト（Web版の@keyframes drift相当）
    const t = (clock.value / 22000) * Math.PI * 2;
    const wave = (Math.sin(t) + 1) / 2;
    return [
      { translateX: (wave * 5 - 2) * driftScale },
      { translateY: (wave * 3 - 1) * driftScale },
      { scale: 1 + wave * 0.08 },
    ];
  });
  return (
    <Group transform={transform} origin={vec(cx, cy)}>
      <Circle cx={cx} cy={cy} r={r} opacity={0.35}>
        <RadialGradient c={vec(cx, cy)} r={r} colors={[color, `${color}00`]} />
      </Circle>
    </Group>
  );
}

/**
 * 全画面の夜空背景。
 * カスタム背景が設定されていればその画像を、オーバーレイONなら星とオーロラを重ねる。
 */
export function NightSky() {
  const { width, height } = useWindowDimensions();
  const background = useUi((s) => s.background);
  const clock = useClock();
  const stars = useMemo(() => makeStars(60, width, height), [width, height]);

  const hasCustomBg = background.imageUri !== null;
  const showOverlay = !hasCustomBg || background.overlayEnabled;
  const maxDim = Math.max(width, height);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hasCustomBg && background.imageUri ? (
        <Image source={{ uri: background.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {showOverlay ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {!hasCustomBg ? (
            <Rect x={0} y={0} width={width} height={height}>
              <RadialGradient
                c={vec(width / 2, height * 0.2)}
                r={maxDim * 0.95}
                colors={[colors.nightMid, colors.nightDeep]}
              />
            </Rect>
          ) : null}
          <AuroraBlob
            cx={width * 0.2}
            cy={height * 0.3}
            r={maxDim * 0.45}
            color={colors.auroraTeal}
            clock={clock}
            driftScale={4}
          />
          <AuroraBlob
            cx={width * 0.8}
            cy={height * 0.25}
            r={maxDim * 0.45}
            color={colors.auroraViolet}
            clock={clock}
            driftScale={5}
          />
          <AuroraBlob
            cx={width * 0.5}
            cy={height * 0.8}
            r={maxDim * 0.5}
            color={colors.auroraPink}
            clock={clock}
            driftScale={3}
          />
          {stars.map((star) => (
            <TwinkleStar key={star.id} star={star} clock={clock} />
          ))}
          <ShootingStar clock={clock} width={width} height={height} />
        </Canvas>
      ) : null}
    </View>
  );
}
