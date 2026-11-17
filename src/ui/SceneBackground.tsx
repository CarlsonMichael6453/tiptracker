import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { colorsFor, gradientStops, type AppearanceSettings } from "./appearance";

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
export function SceneBackground({ settings, animate = false }: { settings: AppearanceSettings; animate?: boolean }) {
  const { width, height } = useWindowDimensions();
  const [a, b] = colorsFor(settings);
  if (settings.style === "gradient") return <Gradient a={a} b={b} animate={animate} />;
  if (settings.style === "twotone") return <TwoTone a={a} b={b} animate={animate} />;
  if (settings.style === "polka") return <Polka base={a} dot={b} width={width} height={height} animate={animate} />;
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
        <SceneBackground settings={settings} />
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
