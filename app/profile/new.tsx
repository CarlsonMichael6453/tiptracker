import { router } from "expo-router";
import { ProfileSetup } from "../../src/features/profile/ProfileSetup";
import { createProfile } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";

export default function NewProfile() {
  const { db, reload } = useApp();
  return (
    <ProfileSetup
      withHeader
      submitLabel="Create profile"
      onSubmit={async (value) => {
        if (!db) return;
        await createProfile(db, value);
        await reload();
        router.replace("/(tabs)");
      }}
    />
  );
}
