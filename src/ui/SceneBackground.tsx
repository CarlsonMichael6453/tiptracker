import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { colorsFor, gradientStops, type AppearanceSettings } from "./appearance";

/** Full-screen backdrop. Web uses CSS; native uses plain Views. */
export function SceneBackground({ settings }: { settings: AppearanceSettings }) {
  const { width, height } = useWindowDimensions();
  const [a, b] = colorsFor(settings);
  if (settings.style === "gradient") return <Gradient a={a} b={b} />;
  if (settings.style === "twotone") return <TwoTone a={a} b={b} />;
  if (settings.style === "polka") return <Polka base={a} dot={b} width={width} height={height} />;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: a }]} />;
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

function Gradient({ a, b }: { a: string; b: string }) {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundImage: `linear-gradient(160deg, ${a}, ${b})` } as object,
        ]}
      />
    );
  }
  const stops = gradientStops(a, b, 20);
  return (
    <View style={StyleSheet.absoluteFill}>
      {stops.map((color, index) => (
        <View key={index} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}

function TwoTone({ a, b }: { a: string; b: string }) {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundImage: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` } as object,
        ]}
      />
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: a, overflow: "hidden" }]}>
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

function Polka({ base, dot, width, height }: { base: string; dot: string; width: number; height: number }) {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: base,
            backgroundImage: `radial-gradient(${dot} 22%, transparent 24%)`,
            backgroundSize: "22px 22px",
          } as object,
        ]}
      />
    );
  }
  const gap = 22;
  const cols = Math.max(1, Math.ceil(width / gap) + 1);
  const rows = Math.max(1, Math.ceil(height / gap) + 1);
  const dots: { x: number; y: number; key: string }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      dots.push({ x: col * gap + (row % 2) * (gap / 2), y: row * gap, key: `${col}-${row}` });
    }
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: "hidden" }]}>
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
    </View>
  );
}
