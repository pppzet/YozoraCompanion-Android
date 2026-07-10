import {
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
  RadialGradient,
  Skia,
  rect,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import type { SkPath } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { colors } from "@/lib/theme";
import type { Expression } from "@/lib/types";

/**
 * 初期キャラ「ルナ」。Web版のSVGうさぎをSkiaに移植し、
 * 呼吸とまばたきのアニメーションを添えたもの。ビューボックスは 200x220。
 */

function svgPath(d: string): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);
  if (!path) throw new Error(`invalid path: ${d}`);
  return path;
}

const EAR_LEFT = svgPath("M85,78 C78,50 76,20 88,8 C96,10 98,20 96,45 C94,60 92,72 92,80 Z");
const EAR_LEFT_INNER = svgPath("M87,70 C83,48 82,26 89,15 C93,25 93,45 91,68 Z");
const EAR_RIGHT = svgPath(
  "M112,80 C112,60 110,35 116,15 C124,10 132,18 130,32 C128,44 120,50 122,62 C124,70 118,78 108,80 Z",
);
const EAR_RIGHT_INNER = svgPath("M116,70 C115,52 116,32 120,20 C126,24 127,36 123,50 C121,58 118,64 118,70 Z");
const EAR_STAR = svgPath("M89,52 l1.6,3.4 3.6,0.4 -2.7,2.4 0.8,3.6 -3.3,-1.9 -3.3,1.9 0.8,-3.6 -2.7,-2.4 3.6,-0.4 z");

const MOUTH_NORMAL = svgPath("M95,120 Q100,123 105,120");
const SMILE_EYE_LEFT = svgPath("M83,109 Q88,103 93,109");
const SMILE_EYE_RIGHT = svgPath("M107,109 Q112,103 117,109");
const SMILE_MOUTH = svgPath("M91,118 Q100,128 109,118");
const SLEEPY_EYE_LEFT = svgPath("M84,109 L93,109");
const SLEEPY_EYE_RIGHT = svgPath("M107,109 L116,109");
const SLEEPY_MOUTH = svgPath("M97,121 Q100,124 103,121");
const SLEEPY_Z1 = svgPath("M119,78 L127,78 L119,86 L127,86");
const SLEEPY_Z2 = svgPath("M129,69 L135,69 L129,75 L135,75");
const SAD_BROW_LEFT = svgPath("M82,103 L94,107");
const SAD_BROW_RIGHT = svgPath("M118,103 L106,107");
const SAD_MOUTH = svgPath("M92,124 Q100,116 108,124");
const SAD_TEAR = svgPath("M89,113 C91,116 92,119 90,122 C88,124 86,122 86,119 C86,116 87,114 89,113 Z");

function Bleed() {
  return (
    <RadialGradient
      c={vec(100, 99)}
      r={130}
      colors={[`${colors.auroraTeal}59`, `${colors.auroraViolet}40`, `${colors.auroraPink}00`]}
      positions={[0, 0.45, 1]}
    />
  );
}

function Face({ expression }: { expression: Expression }) {
  const night = colors.nightDeep;
  switch (expression) {
    case "smile":
      return (
        <Group>
          <Path path={SMILE_EYE_LEFT} style="stroke" strokeWidth={2} strokeCap="round" color={night} />
          <Path path={SMILE_EYE_RIGHT} style="stroke" strokeWidth={2} strokeCap="round" color={night} />
          <Path path={SMILE_MOUTH} style="stroke" strokeWidth={2} strokeCap="round" color={night} />
        </Group>
      );
    case "sleepy":
      return (
        <Group>
          <Path path={SLEEPY_EYE_LEFT} style="stroke" strokeWidth={2} strokeCap="round" color={night} />
          <Path path={SLEEPY_EYE_RIGHT} style="stroke" strokeWidth={2} strokeCap="round" color={night} />
          <Path path={SLEEPY_MOUTH} style="stroke" strokeWidth={1.6} strokeCap="round" color={night} />
          <Path
            path={SLEEPY_Z1}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            strokeJoin="round"
            color={colors.auroraViolet}
            opacity={0.6}
          />
          <Path
            path={SLEEPY_Z2}
            style="stroke"
            strokeWidth={1.2}
            strokeCap="round"
            strokeJoin="round"
            color={colors.auroraViolet}
            opacity={0.5}
          />
        </Group>
      );
    case "surprised":
      return (
        <Group>
          <Circle cx={88} cy={109} r={4.4} color={night} />
          <Circle cx={112} cy={109} r={4.4} color={night} />
          <Circle cx={89.4} cy={107.4} r={1} color={colors.cream} />
          <Circle cx={113.4} cy={107.4} r={1} color={colors.cream} />
          <Circle cx={100} cy={122} r={3.4} color={night} />
        </Group>
      );
    case "sad":
      return (
        <Group>
          <Path path={SAD_BROW_LEFT} style="stroke" strokeWidth={1.6} strokeCap="round" color={night} opacity={0.7} />
          <Path path={SAD_BROW_RIGHT} style="stroke" strokeWidth={1.6} strokeCap="round" color={night} opacity={0.7} />
          <Circle cx={88} cy={111} r={3} color={night} />
          <Circle cx={112} cy={111} r={3} color={night} />
          <Path path={SAD_MOUTH} style="stroke" strokeWidth={1.8} strokeCap="round" color={night} />
          <Path path={SAD_TEAR} color={colors.auroraTeal} opacity={0.75} />
        </Group>
      );
    case "normal":
      return null; // まばたき付きの目は下で描く
  }
}

export function LunaSkia({ width, height, expression }: { width: number; height: number; expression: Expression }) {
  const clock = useClock();

  // ゆっくりした呼吸（3.6秒周期）
  const breath = useDerivedValue(() => {
    const t = (clock.value / 3600) * Math.PI * 2;
    return [{ scaleY: 1 + 0.012 * Math.sin(t) }, { scaleX: 1 + 0.006 * Math.sin(t + Math.PI) }];
  });

  // 通常の表情だけ、ときどきまばたき（4.8秒周期のうち240ms）
  const blink = useDerivedValue(() => {
    const t = clock.value % 4800;
    let scaleY = 1;
    if (t < 120) scaleY = 1 - (t / 120) * 0.88;
    else if (t < 240) scaleY = 0.12 + ((t - 120) / 120) * 0.88;
    return [{ scaleY }];
  });

  const scale = Math.min(width / 200, height / 220);
  const offsetX = (width / scale - 200) / 2;
  const offsetY = height / scale - 220;

  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ scale }, { translateX: offsetX }, { translateY: offsetY }]}>
        {/* 地面の影 */}
        <Oval rect={rect(54, 199, 92, 16)} color={colors.shadowPurple} opacity={0.25} />

        <Group transform={breath} origin={vec(100, 202)}>
          {/* 耳 */}
          <Path path={EAR_LEFT} color={colors.cream} />
          <Path path={EAR_LEFT} style="stroke" strokeWidth={2} color={colors.shadowPurple} />
          <Path path={EAR_LEFT_INNER} color={colors.auroraPink} opacity={0.32} />
          <Path path={EAR_RIGHT} color={colors.cream} />
          <Path path={EAR_RIGHT} style="stroke" strokeWidth={2} color={colors.shadowPurple} />
          <Path path={EAR_RIGHT_INNER} color={colors.auroraPink} opacity={0.32} />
          <Path path={EAR_STAR} color={colors.auroraTeal} opacity={0.55} />

          {/* 頭 */}
          <Circle cx={100} cy={110} r={36} color={colors.cream} />
          <Circle cx={100} cy={110} r={36}>
            <Bleed />
          </Circle>
          <Circle cx={100} cy={110} r={36} style="stroke" strokeWidth={2} color={colors.shadowPurple} />

          {/* 体 */}
          <Oval rect={rect(56, 126, 88, 76)} color={colors.cream} />
          <Oval rect={rect(56, 126, 88, 76)} opacity={0.7}>
            <Bleed />
          </Oval>
          <Oval rect={rect(56, 126, 88, 76)} style="stroke" strokeWidth={2} color={colors.shadowPurple} />

          {/* ほっぺ */}
          <Oval rect={rect(74, 116, 12, 8)} color={colors.auroraPink} opacity={0.45} />
          <Oval rect={rect(114, 116, 12, 8)} color={colors.auroraPink} opacity={0.45} />

          {/* 表情 */}
          {expression === "normal" ? (
            <Group>
              <Group transform={blink} origin={vec(100, 108)}>
                <Circle cx={88} cy={108} r={3} color={colors.nightDeep} />
                <Circle cx={112} cy={108} r={3} color={colors.nightDeep} />
              </Group>
              <Path path={MOUTH_NORMAL} style="stroke" strokeWidth={1.6} strokeCap="round" color={colors.nightDeep} />
            </Group>
          ) : (
            <Face expression={expression} />
          )}
        </Group>
      </Group>
    </Canvas>
  );
}
