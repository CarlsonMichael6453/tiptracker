import { Redirect, router } from "expo-router";
import { ProfileSetup } from "../src/features/profile/ProfileSetup";
import { createProfile } from "../src/repo/repository";
import { useApp } from "../src/state/AppState";

export default function Onboarding() {
  const { db, activeProfile, reload } = useApp();
  if (activeProfile) return <Redirect href="/(tabs)" />;
  return (
    <ProfileSetup
      submitLabel="Continue"
      onSubmit={async (value) => {
        if (!db) return;
        await createProfile(db, value);
        await reload();
        router.replace("/(tabs)");
      }}
    />
  );
}
