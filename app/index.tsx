import { Redirect } from "expo-router";
import { useApp } from "../src/state/AppState";
import { firstLaunch } from "../src/welcome/tour";

export default function Index() {
  const { ready, activeProfile, welcomeSeen } = useApp();
  if (!ready) return null;
  const place = firstLaunch(welcomeSeen, Boolean(activeProfile));
  return <Redirect href={place} />;
}
