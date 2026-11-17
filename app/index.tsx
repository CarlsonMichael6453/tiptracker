import { Redirect } from "expo-router";
import { useApp } from "../src/state/AppState";

export default function Index() {
  const { ready, activeProfile } = useApp();
  if (!ready) return null;
  if (!activeProfile) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
