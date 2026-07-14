import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Path,
  RadialGradient,
  Skia,
  useClock,
  vec,
  BlurMask,
} from "@shopify/react-native-skia";
import type { SkPath } from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDerivedValue, useSharedValue, useAnimatedReaction, withTiming, Easing } from "react-native-reanimated";
import { clockText } from "@/lib/format";
import { colors } from "@/lib/theme";

/**
 * 背景の時計「星霜の塔」。
 * Web版のSVG時計（分針リング・時針盤・秒針が回る）をSkiaへ移植したもの。
 * ビューボックスは 400x400、中心は (200,200)。
 */

const CX = 200;
const CY = 200;
const DEG = Math.PI / 180;

function polygonPath(points: readonly (readonly [number, number])[]): SkPath {
  const path = Skia.Path.Make();
  points.forEach(([x, y], i) => {
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.close();
  return path;
}

function ringTicksPath(count: number, rOuter: number, rInner: number, skip?: (i: number) => boolean): SkPath {
  const path = Skia.Path.Make();
  for (let i = 0; i < count; i++) {
    if (skip && skip(i)) continue;
    const rad = ((i / count) * 360 - 90) * DEG;
    path.moveTo(CX + rOuter * Math.cos(rad), CY + rOuter * Math.sin(rad));
    path.lineTo(CX + rInner * Math.cos(rad), CY + rInner * Math.sin(rad));
  }
  return path;
}

function dotsPath(count: number, r: number, dotRadius: number): SkPath {
  const path = Skia.Path.Make();
  for (let i = 0; i < count; i++) {
    const rad = ((i / count) * 360 - 90) * DEG;
    path.addCircle(CX + r * Math.cos(rad), CY + r * Math.sin(rad), dotRadius);
  }
  return path;
}

// 分針リング（60目盛り。0位置は赤）
const MINOR_TICKS = ringTicksPath(60, 182, 170, (i) => i % 5 === 0);
const MAJOR_TICKS = ringTicksPath(60, 182, 163, (i) => i % 5 !== 0 || i === 0);
const RED_TICK = ringTicksPath(60, 182, 163, (i) => i !== 0);

// 時針盤の幾何学模様
const DIAMOND_LARGE = polygonPath([
  [200, 72],
  [328, 200],
  [200, 328],
  [72, 200],
]);
const DIAMOND_MID = polygonPath([
  [200, 96],
  [304, 200],
  [200, 304],
  [96, 200],
]);
const DIAMOND_SMALL = polygonPath([
  [200, 148],
  [252, 200],
  [200, 252],
  [148, 200],
]);
const FACE_TICKS = ringTicksPath(12, 148, 134);
const FACE_DOTS = dotsPath(12, 155, 1.6);

// 方位の矢印たち
const ARROW_BIG = polygonPath([
  [200, 52],
  [221, 86],
  [200, 120],
  [179, 86],
]);
const ARROW_SIDE = polygonPath([
  [200, 70],
  [212, 95],
  [200, 120],
  [188, 95],
]);
const ARROW_SMALL = polygonPath([
  [200, 96],
  [206, 110.5],
  [200, 125],
  [194, 110.5],
]);
const CENTER_DIAMOND = polygonPath([
  [200, 183],
  [217, 200],
  [200, 217],
  [183, 200],
]);
const CENTER_DIAMOND_INNER = polygonPath([
  [200, 192],
  [208, 200],
  [200, 208],
  [192, 200],
]);
const SECOND_HAND = polygonPath([
  [200, 36],
  [206, 50],
  [200, 46],
  [194, 50],
]);
const TOP_MARKER = polygonPath([
  [200, 18],
  [207, 32],
  [193, 32],
]);

interface AmbientClockProps {
  size: number;
}

export function AmbientClock({ size }: AmbientClockProps) {
  const clock = useClock();
  const mountEpoch = useMemo(() => Date.now() - performance.now(), []);
  const tzOffsetMs = useMemo(() => new Date().getTimezoneOffset() * 60000, []);

  // useClock はマウントからの経過ms。実時刻へ換算して各針の角度を出す。
  const clockStart = useMemo(() => performance.now(), []);

// 時刻から「今の時/分」を出すだけの部分(角度計算はしない)
const hourOfDayValue = useDerivedValue(() => {
  const local = mountEpoch + clockStart + clock.value - tzOffsetMs;
  const daySec = (local / 1000) % 86400;
  return Math.floor(daySec / 3600) % 12;
});
const minuteOfHourValue = useDerivedValue(() => {
  const local = mountEpoch + clockStart + clock.value - tzOffsetMs;
  const daySec = (local / 1000) % 86400;
  return Math.floor(daySec / 60) % 60;
});

// 実際に描画で使う「表示角度」(累積で増やす。巻き戻り無し)
const hourTarget = useSharedValue(hourOfDayValue.value * 30);
const minuteTarget = useSharedValue(minuteOfHourValue.value * 6);
const hourDisplay = useSharedValue(hourTarget.value);
const minuteDisplay = useSharedValue(minuteTarget.value);

// 時が切り替わった瞬間だけ検知して、withTimingでふわっと寄せる
useAnimatedReaction(
  () => hourOfDayValue.value,
  (current, previous) => {
    if (previous !== null && current !== previous) {
      hourTarget.value += 30;
      hourDisplay.value = withTiming(hourTarget.value, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  },
  []
);
useAnimatedReaction(
  () => minuteOfHourValue.value,
  (current, previous) => {
    if (previous !== null && current !== previous) {
      minuteTarget.value += 6;
      minuteDisplay.value = withTiming(minuteTarget.value, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  },
  []
);

const hourTransform = useDerivedValue(() => [{ rotate: hourDisplay.value * DEG }]);
const minuteTransform = useDerivedValue(() => [{ rotate: minuteDisplay.value * DEG }]);
const secondTransform = useDerivedValue(() => {
    const local = mountEpoch + clockStart + clock.value - tzOffsetMs;
      const seconds = (local / 1000) % 60;
        return [{ rotate: seconds * 6 * DEG }];
        });

  const [digital, setDigital] = useState(() => clockText(new Date()));
  useEffect(() => {
    const id = setInterval(() => setDigital(clockText(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const origin = vec(CX, CY);
  const scale = size / 400;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.caption}>星霜の塔</Text>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale }]}>
          {/* 頂点の目印 */}
          <Path path={TOP_MARKER} color={colors.auroraTeal} opacity={0.85}>
            <BlurMask blur={2.4} style="solid" />
          </Path>

          {/* 分針リング */}
          <Group transform={minuteTransform} origin={origin}>
            <Circle cx={CX} cy={CY} r={182} opacity={0.6}>
              <RadialGradient c={origin} r={182} colors={["#a78bfa10", "#6ee7c91a"]} />
            </Circle>
            <Circle
              cx={CX}
              cy={CY}
              r={182}
              style="stroke"
              strokeWidth={1.2}
              color={colors.shadowPurple}
              opacity={0.5}
            />
            <Path
              path={MINOR_TICKS}
              style="stroke"
              strokeWidth={0.9}
              strokeCap="round"
              color={colors.cream}
              opacity={0.32}
            />
            <Path
              path={MAJOR_TICKS}
              style="stroke"
              strokeWidth={1.6}
              strokeCap="round"
              color={colors.cream}
              opacity={0.6}
            />
            <Path path={RED_TICK} style="stroke" strokeWidth={3} strokeCap="round" color={colors.accentRed} />
            <Circle cx={CX} cy={CY - 189} r={3.2} color={colors.accentRed} />
          </Group>

          {/* 時針盤 */}
          <Group transform={hourTransform} origin={origin}>
            <Circle cx={CX} cy={CY} r={148}>
              <RadialGradient
                c={vec(180, 160)}
                r={260}
                colors={["#3a2f5c", "#2a2148", "#1c1636"]}
                positions={[0, 0.55, 1]}
              />
            </Circle>
            <Circle cx={CX} cy={CY} r={148} style="stroke" strokeWidth={2} color={colors.cream} opacity={0.85} />
            <Circle cx={CX} cy={CY} r={128} style="stroke" strokeWidth={0.6} color={colors.cream} opacity={0.28} />
            <Path path={DIAMOND_LARGE} style="stroke" strokeWidth={0.7} color={colors.cream} opacity={0.24} />
            <Circle cx={CX} cy={CY} r={104} style="stroke" strokeWidth={0.6} color={colors.cream} opacity={0.22} />
            <Path path={DIAMOND_MID} style="stroke" strokeWidth={0.8} color={colors.cream} opacity={0.32} />
            <Circle cx={CX} cy={CY} r={78} style="stroke" strokeWidth={0.8} color={colors.cream} opacity={0.3} />
            <Circle cx={CX} cy={CY} r={52} style="stroke" strokeWidth={0.6} color={colors.cream} opacity={0.28} />
            <Path path={DIAMOND_SMALL} style="stroke" strokeWidth={0.9} color={colors.cream} opacity={0.42} />
            <Circle cx={CX} cy={CY} r={30} style="stroke" strokeWidth={0.7} color={colors.auroraTeal} opacity={0.28}>
              <DashPathEffect intervals={[1.5, 4.5]} />
            </Circle>
            <Path
              path={FACE_TICKS}
              style="stroke"
              strokeWidth={1.6}
              strokeCap="round"
              color={colors.cream}
              opacity={0.55}
            />
            <Path path={FACE_DOTS} color={colors.auroraTeal} opacity={0.6} />

            {/* 北の大矢印（光る） */}
            <Path path={ARROW_BIG} color={colors.cream} opacity={0.9}>
              <BlurMask blur={3.2} style="solid" />
            </Path>
            <Path path={ARROW_BIG} style="stroke" strokeWidth={1.8} strokeJoin="round" color={colors.auroraViolet} />
            {/* 東西の矢印 */}
            <Group transform={[{ rotate: 90 * DEG }]} origin={origin}>
              <Path path={ARROW_SIDE} color={colors.shadowPurple} opacity={0.9} />
              <Path
                path={ARROW_SIDE}
                style="stroke"
                strokeWidth={1.2}
                strokeJoin="round"
                color={colors.cream}
                opacity={0.9}
              />
            </Group>
            <Group transform={[{ rotate: -90 * DEG }]} origin={origin}>
              <Path path={ARROW_SIDE} color={colors.shadowPurple} opacity={0.9} />
              <Path
                path={ARROW_SIDE}
                style="stroke"
                strokeWidth={1.2}
                strokeJoin="round"
                color={colors.cream}
                opacity={0.9}
              />
            </Group>
            {/* 南の小矢印 */}
            <Group transform={[{ rotate: 180 * DEG }]} origin={origin}>
              <Path path={ARROW_SMALL} color={colors.auroraPink} opacity={0.85} />
              <Path
                path={ARROW_SMALL}
                style="stroke"
                strokeWidth={1}
                strokeJoin="round"
                color={colors.cream}
                opacity={0.85}
              />
            </Group>

            {/* 中央の飾り */}
            <Circle cx={CX} cy={CY} r={22} style="stroke" strokeWidth={1.2} color={colors.auroraTeal} opacity={0.5}>
              <BlurMask blur={2} style="solid" />
            </Circle>
            <Path path={CENTER_DIAMOND} color={colors.cream} opacity={0.95} />
            <Path
              path={CENTER_DIAMOND}
              style="stroke"
              strokeWidth={1.6}
              strokeJoin="round"
              color={colors.auroraViolet}
            />
            <Path path={CENTER_DIAMOND_INNER} color={colors.auroraPink} opacity={0.85} />
          </Group>

          {/* 秒針 */}
          <Group transform={secondTransform} origin={origin}>
            <Path path={SECOND_HAND} color={colors.accentRed}>
              <BlurMask blur={2.4} style="solid" />
            </Path>
          </Group>
        </Group>
      </Canvas>
      <Text style={styles.digital}>{digital}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    position: "absolute",
    top: "4%",
    color: colors.shadowPurple,
    fontSize: 12,
    letterSpacing: 5,
    opacity: 0.55,
    fontFamily: "ShipporiMincho_400Regular",
  },
  digital: {
    position: "absolute",
    bottom: "11%",
    color: colors.cream,
    opacity: 0.3,
    fontSize: 13,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
});
