import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { todayCivil } from "../calc/dates";
import type { BudgetLedger } from "../budget/types";
import { DEFAULT_WEEK_STARTS_ON } from "../calc/classify";
import type { Profile, ShiftRecord } from "../domain/types";
import { useApp } from "../state/AppState";
import { buildTourDemo, EXAMPLE_DATA_LABEL, TOUR_GUEST_ID, TOUR_GUEST_PROFILE } from "../welcome/tourDemo";
import { useTour } from "./TourLayer";
import { useTheme } from "./theme";
import { Text } from "./text";

type TourDemoValue = {
  active: boolean;
  shifts: ShiftRecord[];
  goalCents: number | null;
  budget: BudgetLedger | null;
};

const IDLE: TourDemoValue = { active: false, shifts: [], goalCents: null, budget: null };

const TourDemoContext = createContext<TourDemoValue>(IDLE);

/** In-memory example data. It exists only while the tour is running and is never written. */
export function TourDemoProvider({ children }: { children: ReactNode }) {
  const { running } = useTour();
  const { activeProfile } = useApp();
  const profileId = activeProfile?.id ?? (running ? TOUR_GUEST_ID : null);
  const weekStartsOn = activeProfile?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
  const value = useMemo<TourDemoValue>(() => {
    if (!running || !profileId) return IDLE;
    const demo = buildTourDemo({ today: todayCivil(), weekStartsOn, profileId });
    return { active: true, shifts: demo.shifts, goalCents: demo.goalCents, budget: demo.budget };
  }, [running, profileId, weekStartsOn]);
  return <TourDemoContext.Provider value={value}>{children}</TourDemoContext.Provider>;
}

export function useTourDemo() {
  return useContext(TourDemoContext);
}

/** The saved profile, or the unsaved tour stand-in while the tour is running. */
export function useWorkingProfile(): Profile | null {
  const { activeProfile } = useApp();
  const { running } = useTour();
  if (activeProfile) return activeProfile;
  if (running) return TOUR_GUEST_PROFILE;
  return null;
}

/** Small label so a sample week is not mistaken for the person's own numbers. */
export function ExampleDataTag() {
  const demo = useTourDemo();
  const { palette } = useTheme();
  if (!demo.active) return null;
  return (
    <View
      style={{
        marginLeft: 16,
        marginTop: 6,
        zIndex: 2,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.card,
      }}
    >
      <Text accessibilityLabel={EXAMPLE_DATA_LABEL} style={{ color: palette.accent, fontSize: 12, fontWeight: "800" }}>
        {EXAMPLE_DATA_LABEL}
      </Text>
    </View>
  );
}
