import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import Constants from "expo-constants";
import { formatClock, formatHoursPhrase, formatMoneyInput } from "../../src/calc/format";
import { parseMoney } from "../../src/calc/money";
import { backupFilename, parseBackup } from "../../src/calc/backup";
import { shiftsToCsv } from "../../src/calc/shiftExport";
import type { Role } from "../../src/domain/types";
import { exportBackup, importBackup } from "../../src/repo/backup";
import {
  countShifts,
  deleteAllShifts,
  deleteProfile,
  listRoles,
  listShifts,
  reorderRoles,
  updateProfile,
} from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { resolveGoalStyle } from "../../src/calc/goalStyle";
import { AppearancePicker } from "../../src/ui/AppearancePicker";
import { GoalStylePicker } from "../../src/ui/GoalMark";
import { AppearanceType } from "../../src/ui/AppearanceType";
import { defaultAppearance } from "../../src/ui/appearance";
import { Button, Card, ErrorList, Field, Muted, Screen, Title, useScreenScroll, WeekStartPicker } from "../../src/ui/components";
import { useWorkingProfile } from "../../src/ui/TourDemo";
import { TourAnchor, useTour } from "../../src/ui/TourLayer";
import { TOUR_GUEST_ID } from "../../src/welcome/tourDemo";
import { useTheme } from "../../src/ui/theme";
import { Text } from "../../src/ui/text";

export default function Settings() {
  const { db, profiles, reload, setActive, saveProfileAppearance, saveTipJar } = useApp();
  const activeProfile = useWorkingProfile();
  const { palette } = useTheme();
  const [roles, setRoles] = useState<Role[]>([]);
  const [exportText, setExportText] = useState<string | null>(null);
  const [backupText, setBackupText] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [wage, setWage] = useState("");
  const [weekStartsOn, setWeekStartsOn] = useState(3);
  const [payStartsOn, setPayStartsOn] = useState(5);
  const [payWeeks, setPayWeeks] = useState<1 | 2>(1);
  const [cutoff, setCutoff] = useState(16 * 60);
  const [threshold, setThreshold] = useState(8 * 60);
  const [errors, setErrors] = useState<string[]>([]);
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const scroll = useScreenScroll();
  const { target: tourTarget } = useTour();

  useEffect(() => {
    if (tourTarget !== "appearance") return;
    const timer = setTimeout(() => scroll?.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [tourTarget, scroll]);

  useEffect(() => {
    if (!activeProfile) return;
    setName(activeProfile.name);
    setWage(formatMoneyInput(activeProfile.defaultWageCents));
    setWeekStartsOn(activeProfile.weekStartsOn);
    setPayStartsOn(activeProfile.payPeriodStartsOn);
    setPayWeeks(activeProfile.payPeriodWeeks);
    setCutoff(activeProfile.lunchCutoffMinutes);
    setThreshold(activeProfile.doubleThresholdMinutes);
  }, [activeProfile]);

  const loadRoles = useCallback(async () => {
    if (!db || !activeProfile) return;
    setRoles(await listRoles(db, activeProfile.id));
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadRoles();
    }, [loadRoles]),
  );

  if (!activeProfile || !db) return null;
  const profile = activeProfile;
  const database = db;

  const saveProfile = async () => {
    if (profile.id === TOUR_GUEST_ID) return;
    const nextErrors: string[] = [];
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) nextErrors.push("Enter a name, up to 40 characters.");
    const parsed = parseMoney(wage);
    if (parsed.status !== "ok") nextErrors.push("Enter your hourly wage.");
    setErrors(nextErrors);
    if (nextErrors.length > 0 || parsed.status !== "ok") return;
    await updateProfile(database, profile.id, {
      name: trimmed,
      defaultWageCents: parsed.cents,
      weekStartsOn,
      payPeriodStartsOn: payStartsOn,
      payPeriodWeeks: payWeeks,
      lunchCutoffMinutes: cutoff,
      doubleThresholdMinutes: threshold,
    });
    await reload();
  };

  const confirmDeleteShifts = async () => {
    const count = await countShifts(database, profile.id);
    Alert.alert(`Delete all ${count} ${count === 1 ? "shift" : "shifts"} on ${profile.name}? This can’t be undone.`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete shifts",
        style: "destructive",
        onPress: () => {
          void deleteAllShifts(database, profile.id);
        },
      },
    ]);
  };

  const confirmDeleteProfile = () => {
    if (profile.id === TOUR_GUEST_ID) return;
    Alert.alert(
      `Delete ${profile.name}, its roles, and its shifts? This can’t be undone.`,
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete profile",
          style: "destructive",
          onPress: () => {
            void deleteProfile(database, profile.id).then(async () => {
              await reload();
              router.replace("/");
            });
          },
        },
      ],
    );
  }

  const saveBackup = async () => {
    setBackupMessage(null);
    const json = await exportBackup(database);
    const filename = backupFilename();
    const downloaded = downloadFileOnWeb(json, filename, "application/json;charset=utf-8");
    if (downloaded) {
      setBackupText(null);
      setBackupMessage(`Downloaded ${filename}.`);
      return;
    }
    setBackupText(json);
  };

  const applyBackup = async (json: string) => {
    setBackupMessage(null);
    const parsed = parseBackup(json);
    if (!parsed.ok) {
      setBackupMessage(parsed.error);
      return;
    }
    confirmReplaceWithBackup(() => {
      void importBackup(database, json).then(async (result) => {
        if (!result.ok) {
          setBackupMessage(result.error);
          return;
        }
        setPasteText("");
        setShowPaste(false);
        setBackupText(null);
        setBackupMessage("Backup restored.");
        await reload();
      });
    });
  };

  const startRestore = () => {
    setBackupMessage(null);
    if (Platform.OS === "web") {
      void pickTextFileOnWeb().then((text) => {
        if (text == null) return;
        if (!text.trim()) {
          setBackupMessage("That file was empty.");
          return;
        }
        void applyBackup(text);
      });
      return;
    }
    setShowPaste(true);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...roles];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const item = next[index];
    if (!item) return;
    next.splice(index, 1);
    next.splice(target, 0, item);
    setRoles(next);
    await reorderRoles(database, next.map((role) => role.id));
  };

  return (
    <Screen tipJar>
      <Title>Settings</Title>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Support</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Send feedback" onPress={() => router.push("/feedback")} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: palette.text, fontWeight: "700", fontSize: 17 }}>Send feedback</Text>
          <Text style={{ color: palette.muted, fontSize: 13 }}>A rating and a note. Your shifts stay on this device.</Text>
        </Pressable>
        <Button label="Replay tour" kind="secondary" onPress={() => router.push("/tour?replay=1")} />
        <Button label="See Pro" kind="secondary" onPress={() => router.push("/pro")} />
      </Card>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>This profile</Text>
        <Field label="Name" value={name} keyboard="default" onChangeText={setName} />
        <Field label="Default hourly wage" value={wage} onChangeText={setWage} hint="New roles inherit this. Saved shifts keep their own wage." />
        <GoalStylePicker
          value={resolveGoalStyle(profile.goalIndicator, profile.showTipJar)}
          onChange={(goalIndicator) => void saveTipJar({ goalIndicator, showTipJar: goalIndicator !== "off" })}
        />
        <Text style={{ color: palette.muted, fontWeight: "600" }}>Week starts on</Text>
        <WeekStartPicker value={weekStartsOn} onChange={setWeekStartsOn} />
        <Text style={{ color: palette.muted, fontWeight: "600" }}>Pay period starts on</Text>
        <Text style={{ color: palette.faint, fontSize: 13 }}>Separate from the week above. A weekly Friday payday often starts on Friday.</Text>
        <WeekStartPicker value={payStartsOn} onChange={setPayStartsOn} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Pay every week" onPress={() => setPayWeeks(1)} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: payWeeks === 1 ? palette.primary : palette.card, borderWidth: 1, borderColor: palette.line }}>
            <Text style={{ color: payWeeks === 1 ? palette.onPrimary : palette.text, fontWeight: "700" }}>Every week</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Pay every two weeks" onPress={() => setPayWeeks(2)} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: payWeeks === 2 ? palette.primary : palette.card, borderWidth: 1, borderColor: palette.line }}>
            <Text style={{ color: payWeeks === 2 ? palette.onPrimary : palette.text, fontWeight: "700" }}>Every two weeks</Text>
          </Pressable>
        </View>
        <Stepper
          label="Lunch cutoff"
          value={formatClock(cutoff)}
          hint="Shifts starting before this count as lunch. This does not change your totals."
          onMinus={() => setCutoff((current) => Math.max(0, current - 15))}
          onPlus={() => setCutoff((current) => Math.min(1439, current + 15))}
        />
        <Stepper
          label="Double / all-day threshold"
          value={formatHoursPhrase(threshold)}
          hint="Shifts longer than this count as a double / all-day unless you mark one otherwise."
          onMinus={() => setThreshold((current) => Math.max(360, current - 30))}
          onPlus={() => setThreshold((current) => Math.min(720, current + 30))}
        />
        <ErrorList errors={errors} />
        <Button label="Save profile" onPress={() => void saveProfile()} />
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Roles</Text>
        {roles.map((role, index) => (
          <View key={role.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={role.name} onPress={() => router.push(`/role/${role.id}`)} style={{ flex: 1, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>{role.name}</Text>
              <Text style={{ color: palette.faint, fontSize: 13 }}>{postureLabel(role.posture)} · {role.tipOutSettlement === "cash" ? "Tip-out paid in cash" : "Taken from paycheck"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${role.name} up`} onPress={() => void move(index, -1)} style={stepStyle(palette.line)}>
              <Text style={{ color: palette.text, fontSize: 18 }}>↑</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${role.name} down`} onPress={() => void move(index, 1)} style={stepStyle(palette.line)}>
              <Text style={{ color: palette.text, fontSize: 18 }}>↓</Text>
            </Pressable>
          </View>
        ))}
        <Button label="Add a role" kind="secondary" onPress={() => router.push("/role/new")} />
      </Card>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Back up your shifts</Text>
        <Muted>
          {Platform.OS === "web"
            ? "A CSV is this profile’s shifts. A backup is everything: profiles, roles, shifts, bills, envelopes, goals, pay stubs, and settings. Shifts live only in this browser, so a copy elsewhere is the only backup."
            : "A CSV is this profile’s shifts, as text you can copy. A backup is everything: profiles, roles, shifts, bills, envelopes, goals, pay stubs, and settings. Shifts live only on this phone, so a copy elsewhere is the only backup."}
        </Muted>
        <Button
          label="Make a CSV of my shifts"
          kind="secondary"
          onPress={() => {
            void listShifts(database, profile.id).then((shifts) => {
              const csv = shiftsToCsv(shifts);
              setExportText(csv);
              downloadFileOnWeb(csv, csvFilename(profile.name), "text/csv;charset=utf-8");
            });
          }}
        />
        {exportText ? (
          <Text selectable style={{ color: palette.text, fontSize: 12 }}>
            {exportText}
          </Text>
        ) : null}
        <Button label="Save a backup" kind="secondary" onPress={() => void saveBackup()} />
        {backupText ? (
          <Text selectable style={{ color: palette.text, fontSize: 12 }}>
            {backupText}
          </Text>
        ) : null}
        <Button label="Restore from backup" kind="secondary" onPress={startRestore} />
        {showPaste ? (
          <>
            <Field
              label="Paste a backup"
              value={pasteText}
              onChangeText={setPasteText}
              placeholder=""
              keyboard="default"
              multiline
            />
            <Button label="Use this backup" kind="secondary" onPress={() => void applyBackup(pasteText)} />
          </>
        ) : null}
        {backupMessage ? <Muted>{backupMessage}</Muted> : null}
      </Card>

      <Button label="Delete all shifts on this profile" kind="danger" onPress={() => void confirmDeleteShifts()} />
      <Button label="Delete this profile" kind="danger" onPress={confirmDeleteProfile} />

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>All profiles</Text>
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={profile.name}
            onPress={() => void setActive(profile.id)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: profile.id === activeProfile.id ? palette.accent : palette.text, fontSize: 17, fontWeight: "700" }}>
              {profile.name}
              {profile.id === activeProfile.id ? " · active" : ""}
            </Text>
          </Pressable>
        ))}
        <Button label="Add another profile" kind="secondary" onPress={() => router.push("/profile/new")} />
      </Card>

      <TourAnchor id="appearance">
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Appearance</Text>
        <Muted>Saved on this profile. Every pattern is on this screen. Pick one, then change its colors.</Muted>
        <AppearancePicker
          value={activeProfile.appearance ?? defaultAppearance()}
          onChange={(next) => void saveProfileAppearance(next)}
        />
        <AppearanceType
          value={activeProfile.appearance ?? defaultAppearance()}
          onChange={(next) => void saveProfileAppearance(next)}
        />
      </Card>
      </TourAnchor>

      <Card>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>About</Text>
        <Muted>Tip Tracker {version}</Muted>
        <Muted>Tip Tracker is a personal record of what you enter. It is not tax, payroll, or legal advice.</Muted>
        <Muted>
          {Platform.OS === "web"
            ? "This web copy keeps your shifts in this browser. It does not upload them, and it does not share them with a copy you install from the App Store."
            : "Your shifts stay on this phone. If you back up your phone, your shifts may be in that backup. Tip Tracker does not upload them."}
        </Muted>
      </Card>

      <Button label="Delete all data" kind="danger" onPress={() => router.push("/data/delete")} />
    </Screen>
  );
}

function csvFilename(profileName: string): string {
  const safe = profileName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "shifts";
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `tip-tracker-${safe}-${day}.csv`;
}

/** Browser-only file download. Native has no share-sheet dependency in this app, so it shows copyable text instead. */
function downloadFileOnWeb(text: string, filename: string, mime: string): boolean {
  if (Platform.OS !== "web") return false;
  const g = globalThis as typeof globalThis & {
    document?: { createElement: (tag: string) => { href: string; download: string; click: () => void } };
    Blob?: new (parts: string[], options?: { type: string }) => object;
    URL?: { createObjectURL: (blob: object) => string; revokeObjectURL: (url: string) => void };
  };
  if (!g.document || !g.Blob || !g.URL) return false;
  const blob = new g.Blob([text], { type: mime });
  const url = g.URL.createObjectURL(blob);
  const link = g.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  g.URL.revokeObjectURL(url);
  return true;
}

function pickTextFileOnWeb(): Promise<string | null> {
  if (Platform.OS !== "web") return Promise.resolve(null);
  const web = globalThis as unknown as {
    document?: {
      createElement: (tag: string) => {
        type: string;
        accept: string;
        onchange: ((event: { target?: { files?: ArrayLike<unknown> | null } }) => void) | null;
        click: () => void;
      };
    };
    FileReader?: new () => {
      result: string | ArrayBuffer | null;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      readAsText: (file: unknown) => void;
    };
  };
  if (!web.document || !web.FileReader) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = web.document!.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json,text/plain";
    input.onchange = (event) => {
      const files = event.target?.files;
      const file = files && files.length > 0 ? files[0] : null;
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new web.FileReader!();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

function confirmReplaceWithBackup(onYes: () => void): void {
  const title = "Replace everything with this backup?";
  const message =
    "This removes every profile, shift, goal, bill, and pay stub that’s here now, then loads the backup. Tip Tracker does not keep a copy of what is here now.";
  const web = globalThis as typeof globalThis & { confirm?: (text: string) => boolean };
  if (Platform.OS === "web" && typeof web.confirm === "function") {
    if (web.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Replace everything", style: "destructive", onPress: onYes },
  ]);
}

function postureLabel(posture: Role["posture"]): string {
  if (posture === "tips_out") return "I tip out";
  if (posture === "receives_share") return "I receive tip share";
  return "Both";
}

function stepStyle(border: string) {
  return { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: "center" as const, justifyContent: "center" as const };
}

function Stepper({
  label,
  value,
  hint,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  hint: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.muted, fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={onMinus} style={stepStyle(palette.line)}>
          <Text style={{ color: palette.text, fontSize: 22 }}>−</Text>
        </Pressable>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" }}>{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={onPlus} style={stepStyle(palette.line)}>
          <Text style={{ color: palette.text, fontSize: 22 }}>+</Text>
        </Pressable>
      </View>
      <Muted>{hint}</Muted>
    </View>
  );
}
