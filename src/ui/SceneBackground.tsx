import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { colorsFor, gradientStops, type AppearanceSettings } from "./appearance";
import { isPatternStyle, nativeMotifs, patternMotion, webPaint, type Motif, type PatternStyle } from "./scenePatterns";

const CYCLE_MS = 18000;

const MOTION_CSS = `
@keyframes tiptracker-gradient {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(3%, 4%, 0) rotate(10deg); }
  100% { transform: translate3d(0, 0, 0) rotate(0deg); }
}
@keyframes tiptracker-polka {
  0% { background-position: 0 0; }
  50% { background-position: 22px 11px; }
  100% { background-position: 0 0; }
}
@keyframes tiptracker-sway {
  0% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
  100% { transform: rotate(-6deg); }
}
@keyframes tiptracker-pan {
  0%, 100% { background-position: 0 0; }
  50% { background-position: 18px 10px; }
}
@keyframes tiptracker-drift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(4%, 3%, 0); }
}
@keyframes tiptracker-glow {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2%, 1%, 0) scale(1.08); }
}
@keyframes tiptracker-twinkle {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
`;

let cssReady = false;
function ensureMotionCss() {
  if (cssReady || Platform.OS !== "web" || typeof document === "undefined") return;
  cssReady = true;
  const node = document.createElement("style");
  node.setAttribute("data-tiptracker-motion", "true");
  node.textContent = MOTION_CSS;
  document.head.appendChild(node);
}

/** Full-screen backdrop. Motion is transform or CSS only, and only on this layer. */
export function SceneBackground({
  settings,
  animate = false,
  preview = false,
}: {
  settings: AppearanceSettings;
  animate?: boolean;
  preview?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const [a, b] = colorsFor(settings);
  const moving = animate && !preview;
  if (settings.style === "gradient") return <Gradient a={a} b={b} animate={moving} />;
  if (settings.style === "twotone") return <TwoTone a={a} b={b} animate={moving} />;
  if (settings.style === "polka") return <Polka base={a} dot={b} width={width} height={height} animate={moving} />;
  if (isPatternStyle(settings.style)) return <Decor kind={settings.style} a={a} b={b} animate={moving} preview={preview} />;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: a }]} />;
}

export function PreviewTile({
  settings,
  width = 88,
  height = 44,
}: {
  settings: AppearanceSettings;
  width?: number;
  height?: number;
}) {
  return (
    <View style={{ width, height, borderRadius: 10, overflow: "hidden" }}>
      <View style={{ width, height }}>
        <SceneBackground settings={settings} preview />
      </View>
    </View>
  );
}

function useSlowSwing(active: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      value.stopAnimation();
      value.setValue(0);
      return;
    }
    const swing = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    swing.start();
    return () => swing.stop();
  }, [active, value]);
  return value;
}

function useCssMotion(name: string | null, duration: string) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    ensureMotionCss();
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.style) return;
    node.style.animation = name ? `${name} ${duration} ease-in-out infinite` : "none";
    return () => {
      node.style.animation = "none";
    };
  }, [name, duration]);
  return ref;
}

function Decor({
  kind,
  a,
  b,
  animate,
  preview,
}: {
  kind: PatternStyle;
  a: string;
  b: string;
  animate: boolean;
  preview: boolean;
}) {
  const motion = patternMotion(kind);
  const paint = webPaint(kind, a, b);
  const oversized = Boolean(animate && motion?.oversized);
  const mainName = motion && motion.name !== "tiptracker-twinkle" ? motion.name : null;
  const ref = useCssMotion(Platform.OS === "web" && animate ? mainName : null, motion?.duration ?? "18s");
  const twinkleRef = useCssMotion(Platform.OS === "web" && animate && kind === "stars" ? "tiptracker-twinkle" : null, "20s");
  const swing = useSlowSwing(animate && Platform.OS !== "web");
  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: paint.backgroundColor }]}>
        <View
          ref={ref}
          style={
            {
              position: "absolute",
              width: oversized ? "150%" : "100%",
              height: oversized ? "150%" : "100%",
              left: oversized ? "-25%" : 0,
              top: oversized ? "-25%" : 0,
              backgroundColor: paint.backgroundColor,
              backgroundImage: paint.backgroundImage,
              backgroundSize: paint.backgroundSize,
              backgroundPosition: paint.backgroundPosition,
              backgroundRepeat: "repeat",
            } as object
          }
        />
        {paint.twinkle ? (
          <View
            ref={twinkleRef}
            style={
              {
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundImage: paint.twinkle,
              } as object
            }
          />
        ) : null}
      </View>
    );
  }
  const group = nativeMotifs(kind, preview);
  const translateX = swing.interpolate({ inputRange: [0, 1], outputRange: [0, group.drift] });
  const translateY = swing.interpolate({ inputRange: [0, 1], outputRange: [0, group.drift * 0.6] });
  const opacity = swing.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const colors = [a, b];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: a }]}>
      <Animated.View
        style={{
          position: "absolute",
          width: "140%",
          height: "140%",
          left: "-20%",
          top: "-20%",
          transform: group.spin ? [{ rotate: group.spin }, { translateX }, { translateY }] : [{ translateX }, { translateY }],
        }}
      >
        {group.shapes.map((shape, index) => (
          <MotifView key={index} shape={shape} colors={colors} />
        ))}
      </Animated.View>
      {group.twinkle.length > 0 ? (
        <Animated.View style={{ position: "absolute", width: "100%", height: "100%", opacity: animate ? opacity : 1 }}>
          {group.twinkle.map((shape, index) => (
            <MotifView key={index} shape={shape} colors={colors} />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

function MotifView({ shape, colors }: { shape: Motif; colors: string[] }) {
  return (
    <View
      style={{
        position: "absolute",
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        width: `${shape.w}%`,
        height: `${shape.h}%`,
        borderRadius: shape.round ? 999 : 1,
        backgroundColor: colors[shape.color],
        opacity: shape.soft ? 0.9 : 1,
      }}
    />
  );
}

function Gradient({ a, b, animate }: { a: string; b: string; animate: boolean }) {
  const swing = useSlowSwing(animate && Platform.OS !== "web");
  const motionRef = useCssMotion(Platform.OS === "web" && animate ? "tiptracker-gradient" : null, "18s");
  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: a }]}>
        <View
          ref={motionRef}
          style={
            {
              position: "absolute",
              width: animate ? "160%" : "100%",
              height: animate ? "160%" : "100%",
              left: animate ? "-30%" : 0,
              top: animate ? "-30%" : 0,
              backgroundImage: animate
                ? `linear-gradient(160deg, ${a}, ${b}, ${a})`
                : `linear-gradient(160deg, ${a}, ${b})`,
            } as object
          }
        />
      </View>
    );
  }
  const stops = gradientStops(a, b, 20);
  if (!animate) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {stops.map((color, index) => (
          <View key={index} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
    );
  }
  const rotate = swing.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "10deg"] });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: a }]}>
      <Animated.View
        style={{
          position: "absolute",
          width: "160%",
          height: "160%",
          left: "-30%",
          top: "-30%",
          transform: [{ rotate }],
        }}
      >
        {stops.map((color, index) => (
          <View key={index} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </Animated.View>
    </View>
  );
}

function TwoTone({ a, b, animate }: { a: string; b: string; animate: boolean }) {
  const swing = useSlowSwing(animate && Platform.OS !== "web");
  const motionRef = useCssMotion(Platform.OS === "web" && animate ? "tiptracker-sway" : null, "16s");
  if (Platform.OS === "web") {
    if (!animate) {
      return (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` } as object]}
        />
      );
    }
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: a }]}>
        <View
          ref={motionRef}
          style={
            {
              position: "absolute",
              width: "180%",
              height: "180%",
              left: "-40%",
              top: "-40%",
              backgroundImage: `linear-gradient(135deg, ${a} 50%, ${b} 50%)`,
            } as object
          }
        />
      </View>
    );
  }
  if (!animate) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: a, overflow: "hidden" }]}>
        <View
          style={{
            position: "absolute",
            width: "170%",
            height: "170%",
            backgroundColor: b,
            transform: [{ rotate: "-28deg" }],
            top: "18%",
            left: "-8%",
          }}
        />
      </View>
    );
  }
  const rotate = swing.interpolate({ inputRange: [0, 1], outputRange: ["-34deg", "-22deg"] });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: a, overflow: "hidden" }]}>
      <Animated.View
        style={{
          position: "absolute",
          width: "170%",
          height: "170%",
          backgroundColor: b,
          top: "18%",
          left: "-8%",
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}

function Polka({
  base,
  dot,
  width,
  height,
  animate,
}: {
  base: string;
  dot: string;
  width: number;
  height: number;
  animate: boolean;
}) {
  const swing = useSlowSwing(animate && Platform.OS !== "web");
  const motionRef = useCssMotion(Platform.OS === "web" && animate ? "tiptracker-polka" : null, "18s");
  if (Platform.OS === "web") {
    return (
      <View
        ref={motionRef}
        pointerEvents="none"
        style={
          [
            StyleSheet.absoluteFill,
            {
              backgroundColor: base,
              backgroundImage: `radial-gradient(${dot} 22%, transparent 24%)`,
              backgroundSize: "22px 22px",
            },
          ] as object
        }
      />
    );
  }
  const gap = 22;
  const cols = Math.max(1, Math.ceil(width / gap) + 2);
  const rows = Math.max(1, Math.ceil(height / gap) + 2);
  const dots: { x: number; y: number; key: string }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      dots.push({ x: col * gap + (row % 2) * (gap / 2) - gap, y: row * gap - gap, key: `${col}-${row}` });
    }
  }
  const translateX = swing.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const translateY = swing.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: "hidden" }]}>
      <Animated.View style={{ transform: [{ translateX }, { translateY }] }}>
        {dots.map((item) => (
          <View
            key={item.key}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dot,
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}
