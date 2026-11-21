import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View, type ViewStyle } from "react-native";
import { TOUR_STEPS, stepAfter, tourControls, type TourAction } from "../welcome/tour";
import { useApp } from "../state/AppState";
import { Text } from "./text";
import { useTheme } from "./theme";

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

  const pending = useRef(false);
  const start = useCallback(() => {
    if (!activeProfile) {
      pending.current = true;
      router.replace("/onboarding");
      return;
    }
    setIndex(0);
    setRunning(true);
    router.replace(TOUR_STEPS[0]!.href);
  }, [activeProfile]);

  useEffect(() => {
    if (!pending.current || !activeProfile) return;
    pending.current = false;
    setIndex(0);
    setRunning(true);
  }, [activeProfile]);

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

  const value = useMemo(
    () => ({ running, stepId: running ? step.id : null, target: running ? step.target : null, start, report, listen }),
    [running, step.id, step.target, start, report, listen],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {running ? <CoachMark rect={rects[step.target]} step={step} index={index} onAct={(action) => void act(action)} /> : null}
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
  onAct,
}: {
  rect: TourRect | undefined;
  step: (typeof TOUR_STEPS)[number];
  index: number;
  onAct: (action: TourAction) => void;
}) {
  const { palette } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const controls = tourControls(index, TOUR_STEPS.length);
  const pad = 8;
  const hole = rect
    ? {
        x: Math.max(0, rect.x - pad),
        y: Math.max(0, rect.y - pad),
        w: rect.width + pad * 2,
        h: rect.height + pad * 2,
      }
    : null;
  const captionW = Math.min(340, screenW - 24);
  const captionTop = hole ? placeCaption(hole, screenW, screenH, captionW) : { top: screenH * 0.3, left: 12, pointUp: false };
  const dim = "rgba(16, 18, 14, 0.62)";

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
        }}
      >
        {hole && captionTop.pointUp ? <Pointer up color={palette.card} /> : null}
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>{step.title}</Text>
        <Text style={{ color: palette.text, fontSize: 16, lineHeight: 22 }}>{step.body}</Text>
        {controls.next ? <TourButton label="Next" onPress={() => onAct("next")} /> : null}
        {controls.getStarted ? <TourButton label="Get started" onPress={() => onAct("get-started")} /> : null}
        {controls.replay ? <TourButton label="Replay tutorial" secondary onPress={() => onAct("replay")} /> : null}
      </View>
    </View>
  );
}

function placeCaption(hole: { x: number; y: number; w: number; h: number }, screenW: number, screenH: number, captionW: number) {
  const needed = 210;
  const below = hole.y + hole.h + 14;
  const pointUp = below + needed < screenH - 8;
  const top = pointUp ? below : Math.max(12, hole.y - needed - 8);
  const left = Math.max(12, Math.min(hole.x, screenW - captionW - 12));
  return { top: Math.max(8, Math.min(top, screenH - needed)), left, pointUp };
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

function Pointer({ up, color }: { up: boolean; color: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        marginLeft: 24,
        marginBottom: up ? -4 : 0,
        width: 0,
        height: 0,
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: up ? 12 : 0,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: up ? color : "transparent",
      }}
    />
  );
}
