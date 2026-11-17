import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ShiftForm } from "../../src/features/shift/ShiftForm";
import type { Role } from "../../src/domain/types";
import { listRoles, saveNewShift } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Muted, Screen } from "../../src/ui/components";

export default function NewShift() {
  const { db, activeProfile, reload } = useApp();
  const [roles, setRoles] = useState<Role[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!db || !activeProfile) return;
      void listRoles(db, activeProfile.id).then(setRoles);
    }, [db, activeProfile]),
  );

  if (!activeProfile || !db) return null;
  if (!roles) {
    return (
      <Screen withHeader>
        <Muted>Loading roles…</Muted>
      </Screen>
    );
  }

  return (
    <ShiftForm
      profile={activeProfile}
      roles={roles}
      submitLabel="Save"
      onSubmit={async (write) => {
        const id = await saveNewShift(db, write);
        await reload();
        router.replace(`/shift/${id}`);
      }}
    />
  );
}
