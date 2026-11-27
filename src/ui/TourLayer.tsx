import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View, type ViewStyle } from "react-native";
import {
  APPEARANCE_TOUR_PAIRS,
  appearanceTourIndex,
  appearanceTourLook,
  clampTourRect,
  REPLAY_TOUR_LABEL,
} from "../welcome/appearanceTour";
import { TOUR_STEPS, stepAfter, tourControls, type TourAction } from "../welcome/tour";
import { useApp } from "../state/AppState";
import { colorChoice, fontChoice } from "./colorThemes";
import { StubScanDemo } from "./StubScanDemo";
import { Text } from "./text";
import { useSetTourAppearance, useTheme } from "./theme";
import { useBackgroundMotion } from "./useBackgroundMotion";

export type TourRect = { x: number; y: number; width: number; height: number };

type TourValue = {
  running: boolean;
  stepId: string | null;
  target: string | null;
  start: () => void;
  report: (id: string, rect: TourRect) => void;
  listen: (measure: () => void) => () => void;
};

const TourContext = createContext<TourValue>({
  running: false,
  stepId: null,
  target: null,
  start: () => undefined,
  report: () => undefined,
  listen: () => () => undefined,
});

export function TourProvider({ children }: { children: ReactNode }) {
  const { activeProfile, markWelcomeSeen } = useApp();
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [rects, setRects] = useState<Record<string, TourRect>>({});
  const listeners = useRef(new Set<() => void>());
  const step = TOUR_STEPS[index] ?? TOUR_STEPS[0]!;

  const poke = useCallback(() => {
    listeners.current.forEach((measure) => measure());
  }, []);

  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (!running) return;
    poke();
    const timers = [50, 250, 600].map((delay) => setTimeout(poke, delay));
    return () => timers.forEach(clearTimeout);
  }, [running, index, width, height, poke]);

  useEffect(() => {
    if (!running) return;
    router.replace(step.href);
  }, [running, step.href]);

  const start = useCallback(() => {
    setIndex(0);
    setRunning(true);
    router.replace(TOUR_STEPS[0]!.href);
  }, []);

  const report = useCallback((id: string, rect: TourRect) => {
    setRects((current) => {
      const prev = current[id];
      if (prev && prev.x === rect.x && prev.y === rect.y && prev.width === rect.width && prev.height === rect.height) return current;
      return { ...current, [id]: rect };
    });
  }, []);

  const listen = useCallback((measure: () => void) => {
    listeners.current.add(measure);
    measure();
    return () => listeners.current.delete(measure);
  }, []);

  async function act(action: TourAction) {
    const next = stepAfter(index, TOUR_STEPS.length, action);
    if (next.finished) {
      setRunning(false);
      await markWelcomeSeen();
      router.replace(activeProfile ? "/(tabs)" : "/onboarding");
      return;
    }
    setIndex(next.index);
  }

  const setTourLook = useSetTourAppearance();
  const { reduceMotion } = useBackgroundMotion();
  const previewing = running && step.id === "appearance";
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!previewing || reduceMotion) {
      setPreviewIndex(null);
      setTourLook(null);
      return;
    }
    const started = Date.now();
    let shown = -2;
    let timer: ReturnType<typeof setInterval> | undefined;
    const apply = () => {
      const next = appearanceTourIndex(Date.now() - started, false);
      const key = next == null ? -1 : next;
      if (key === shown) return;
      shown = key;
      setPreviewIndex(next);
      setTourLook(next == null ? null : appearanceTourLook(next));
      if (next == null && timer) clearInterval(timer);
    };
    timer = setInterval(apply, 50);
    apply();
    return () => {
      if (timer) clearInterval(timer);
      setPreviewIndex(null);
      setTourLook(null);
    };
  }, [previewing, reduceMotion, setTourLook]);

  useEffect(() => {
    if (!running || !previewing) return;
    poke();
    const timers = [80, 300, 800].map((delay) => setTimeout(poke, delay));
    return () => timers.forEach(clearTimeout);
  }, [running, previewing, previewIndex, poke]);

  const value = useMemo(
    () => ({ running, stepId: running ? step.id : null, target: running ? step.target : null, start, report, listen }),
    [running, step.id, step.target, start, report, listen],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {running && step.id !== "stub-demo" ? (
        <CoachMark
          rect={rects[step.target]}
          step={step}
          index={index}
          previewIndex={previewing ? previewIndex : null}
          reduceMotion={previewing && reduceMotion}
          onAct={(action) => void act(action)}
        />
      ) : null}
      {running && step.id === "stub-demo" ? <StubScanDemo onNext={() => void act("next")} /> : null}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}

export function TourAnchor({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const ref = useRef<Measurable | null>(null);
  const { report, listen, target } = useTour();
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      report(id, { x, y, width, height });
    });
  }, [id, report]);
  useEffect(() => listen(measure), [listen, measure]);
  useEffect(() => {
    if (target === id) measure();
  }, [target, id, measure]);
  return (
    <View ref={ref as never} collapsable={false} onLayout={measure} style={style}>
      {children}
    </View>
  );
}

function CoachMark({
  rect,
  step,
  index,
  previewIndex,
  reduceMotion,
  onAct,
}: {
  rect: TourRect | undefined;
  step: (typeof TOUR_STEPS)[number];
  index: number;
  previewIndex: number | null;
  reduceMotion: boolean;
  onAct: (action: TourAction) => void;
}) {
  const { palette } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const controls = tourControls(index, TOUR_STEPS.length);
  const preview = step.id === "appearance";
  const hole = rect ? clampTourRect(rect, screenW, screenH) : null;
  const captionW = Math.min(340, screenW - 24);
  const captionH = preview && (previewIndex != null || reduceMotion) ? 280 : controls.getStarted ? 250 : 200;
  const captionTop = hole
    ? placeCaption(hole, screenW, screenH, captionW, captionH)
    : { top: Math.max(8, screenH - captionH - 12), left: 12, pointUp: false, arrow: 24 };
  const dim = "rgba(16, 18, 14, 0.62)";
  const pair = previewIndex == null ? null : APPEARANCE_TOUR_PAIRS[previewIndex];

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      {hole ? (
        <>
          <View pointerEvents="auto" style={{ position: "absolute", top: 0, left: 0, right: 0, height: hole.y, backgroundColor: dim }} />
          <View pointerEvents="auto" style={{ position: "absolute", top: hole.y, left: 0, width: hole.x, height: hole.h, backgroundColor: dim }} />
          <View pointerEvents="auto" style={{ position: "absolute", top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h, backgroundColor: dim }} />
          <View pointerEvents="auto" style={{ position: "absolute", top: hole.y + hole.h, left: 0, right: 0, bottom: 0, backgroundColor: dim }} />
          <View pointerEvents="none" style={{ position: "absolute", top: hole.y, left: hole.x, width: hole.w, height: hole.h, borderRadius: 14, borderWidth: 3, borderColor: palette.accent }} />
        </>
      ) : (
        <View pointerEvents="auto" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: dim }} />
      )}
      <View
        pointerEvents="auto"
        style={{
          position: "absolute",
          top: captionTop.top,
          left: captionTop.left,
          width: captionW,
          backgroundColor: palette.card,
          borderRadius: 16,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: palette.line,
          maxHeight: screenH - 16,
        }}
      >
        {hole ? <Pointer up={captionTop.pointUp} color={palette.card} left={captionTop.arrow} /> : null}
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>{step.title}</Text>
        <Text style={{ color: palette.text, fontSize: 16, lineHeight: 22 }}>{step.body}</Text>
        {pair ? (
          <Text style={{ color: palette.accent, fontWeight: "800" }}>
            {pair.themeLabel} · {pair.fontLabel}
          </Text>
        ) : null}
        {preview && reduceMotion ? <ThemeSwatches /> : null}
        {controls.next ? <TourButton label="Next" onPress={() => onAct("next")} /> : null}
        {controls.getStarted ? <TourButton label="Get started" onPress={() => onAct("get-started")} /> : null}
        {controls.replay ? <TourButton label={REPLAY_TOUR_LABEL} secondary onPress={() => onAct("replay")} /> : null}
      </View>
    </View>
  );
}

function placeCaption(hole: { x: number; y: number; w: number; h: number }, screenW: number, screenH: number, captionW: number, needed: number) {
  const below = hole.y + hole.h + 16;
  const above = hole.y - needed - 16;
  const pointUp = below + needed <= screenH - 8;
  const top = pointUp ? below : above >= 8 ? above : 8;
  const left = Math.max(12, Math.min(hole.x, screenW - captionW - 12));
  const arrow = Math.max(16, Math.min(hole.x + hole.w / 2 - left - 9, captionW - 28));
  return { top: Math.max(8, Math.min(top, screenH - needed - 8)), left, pointUp, arrow };
}

function ThemeSwatches() {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {APPEARANCE_TOUR_PAIRS.map((pair) => {
        const colors = colorChoice(pair.colorTheme).palette;
        const face = fontChoice(pair.font).body;
        return (
          <View key={pair.colorTheme} style={{ flex: 1, gap: 4, borderRadius: 10, padding: 6, backgroundColor: colors?.bg ?? "#F6F1E6" }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: colors?.accent ?? "#24301A" }} />
            <Text style={{ color: colors?.text ?? "#1C1E17", fontFamily: face, fontSize: 11 }}>{pair.fontLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TourButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 52,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? palette.cardAlt : palette.primary,
        borderWidth: secondary ? 1 : 0,
        borderColor: palette.line,
      }}
    >
      <Text style={{ color: secondary ? palette.text : palette.onPrimary, fontWeight: "800", fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}

type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

function Pointer({ up, color, left }: { up: boolean; color: string; left: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top: up ? -12 : undefined,
        bottom: up ? undefined : -12,
        width: 0,
        height: 0,
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: up ? 12 : 0,
        borderTopWidth: up ? 0 : 12,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: up ? color : "transparent",
        borderTopColor: up ? "transparent" : color,
      }}
    />
  );
}
