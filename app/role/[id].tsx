import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { RoleEditor } from "../../src/features/role/RoleEditor";
import type { Role } from "../../src/domain/types";
import { deleteRole, getRole, listRoles, updateRole } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Muted, Screen } from "../../src/ui/components";

export default function EditRole() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeProfile, reload } = useApp();
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [onlyRole, setOnlyRole] = useState(false);

  useEffect(() => {
    if (!db || !id || !activeProfile) return;
    void Promise.all([getRole(db, id), listRoles(db, activeProfile.id)]).then(([next, roles]) => {
      setRole(next);
      setOnlyRole(roles.length <= 1);
    });
  }, [db, id, activeProfile]);

  if (!db || !activeProfile || role === undefined) return null;
  if (!role) {
    return (
      <Screen withHeader>
        <Muted>That role isn’t on this profile.</Muted>
      </Screen>
    );
  }

  return (
    <RoleEditor
      role={role}
      profileWageCents={activeProfile.defaultWageCents}
      onSave={async (value) => {
        try {
          await updateRole(db, role.id, value);
          await reload();
          router.back();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not save the role.";
          if (message.toLowerCase().includes("unique")) {
            Alert.alert("That role name is already on this profile.");
            return;
          }
          Alert.alert(message);
        }
      }}
      onDelete={
        onlyRole
          ? () => Alert.alert("You need at least one role.")
          : () => {
              Alert.alert(`Delete the ${role.name} role? Shifts already logged keep the name ${role.name}.`, undefined, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    void deleteRole(db, role.id)
                      .then(async () => {
                        await reload();
                        router.back();
                      })
                      .catch((error: unknown) => {
                        Alert.alert(error instanceof Error ? error.message : "Could not delete the role.");
                      });
                  },
                },
              ]);
            }
      }
    />
  );
}
