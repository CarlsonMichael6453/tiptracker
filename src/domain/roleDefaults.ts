import type { Posture, Role } from "./types";

/** What a new profile’s starter roles use. Servers still tip out. Bartenders both pay and receive. */
export const STARTER_ROLES: { name: string; posture: Posture }[] = [
  { name: "Server", posture: "tips_out" },
  { name: "Bartender", posture: "both" },
  { name: "Busser", posture: "receives_share" },
  { name: "Host", posture: "receives_share" },
  { name: "Other", posture: "both" },
];

/**
 * A bartender created before this default, still on “receive only” with no tip-out lines,
 * has not had that setting edited. Any saved edit sets tipOutCustomized and is left alone.
 */
export function effectivePosture(role: Pick<Role, "name" | "posture" | "tipOutDefaults" | "tipOutCustomized">): Posture {
  if (role.tipOutCustomized) return role.posture;
  const untouchedBartender =
    role.name.trim().toLowerCase() === "bartender" && role.posture === "receives_share" && role.tipOutDefaults.length === 0;
  return untouchedBartender ? "both" : role.posture;
}
