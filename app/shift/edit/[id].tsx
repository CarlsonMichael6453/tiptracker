import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { formatWeekdayDate } from "../../../src/calc/dates";
import { ShiftForm } from "../../../src/features/shift/ShiftForm";
import { draftFromShift } from "../../../src/features/shift/model";
import type { Role, ShiftRecord } from "../../../src/domain/types";
import { deleteShift, getShift, listRoles, updateShift } from "../../../src/repo/repository";
import { useApp } from "../../../src/state/AppState";
import { Muted, Screen } from "../../../src/ui/components";

export default function EditShift() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeProfile, reload } = useApp();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [shift, setShift] = useState<ShiftRecord | null>(null);

  useEffect(() => {
    if (!db || !activeProfile || !id) return;
    void Promise.all([listRoles(db, activeProfile.id), getShift(db, id)]).then(([nextRoles, nextShift]) => {
      setRoles(nextRoles);
      setShift(nextShift);
    });
  }, [db, activeProfile, id]);

  if (!activeProfile || !db) return null;
  if (!roles || shift === null && roles === null) {
    return (
      <Screen withHeader>
        <Muted>Loading shift…</Muted>
      </Screen>
    );
  }
  if (!shift || !roles) {
    return (
      <Screen withHeader>
        <Muted>That shift isn’t on this phone.</Muted>
      </Screen>
    );
  }

  return (
    <ShiftForm
      profile={activeProfile}
      roles={roles}
      initial={draftFromShift(shift)}
      submitLabel="Save"
      onSubmit={async (write) => {
        await updateShift(db, shift.id, write);
        await reload();
        router.replace(`/shift/${shift.id}`);
      }}
      onDelete={() => {
        Alert.alert(`Delete the ${shift.roleName} shift on ${formatWeekdayDate(shift.shiftDate)}? This can’t be undone.`, undefined, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void deleteShift(db, shift.id).then(() => router.replace("/(tabs)/history"));
            },
          },
        ]);
      }}
    />
  );
}
