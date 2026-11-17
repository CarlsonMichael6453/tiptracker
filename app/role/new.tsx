import { router } from "expo-router";
import { createRole } from "../../src/repo/repository";
import { RoleEditor } from "../../src/features/role/RoleEditor";
import { useApp } from "../../src/state/AppState";

export default function NewRole() {
  const { db, activeProfile } = useApp();
  if (!db || !activeProfile) return null;
  return (
    <RoleEditor
      profileWageCents={activeProfile.defaultWageCents}
      onSave={async (value) => {
        try {
          await createRole(db, { profileId: activeProfile.id, ...value });
          router.back();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not save the role.";
          throw new Error(message.toLowerCase().includes("unique") ? "That role name is already on this profile." : message);
        }
      }}
    />
  );
}
