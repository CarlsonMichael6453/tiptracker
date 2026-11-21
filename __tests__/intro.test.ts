import { EMPTY_INTRO, introProfile } from "../src/features/profile/intro";

describe("quick intro", () => {
  test("the page starts empty, and a name or a job is enough", () => {
    expect(EMPTY_INTRO).toEqual({ name: "", job: "", wage: "" });
    expect(introProfile(EMPTY_INTRO).ok).toBe(false);
    expect(introProfile({ name: "Sam", job: "", wage: "" })).toEqual({
      ok: true,
      name: "Sam",
      wageCents: 0,
      weekStartsOn: 3,
      usualRoleName: "Other",
    });
    expect(introProfile({ name: "", job: "Server", wage: "" })).toMatchObject({
      ok: true,
      name: "Server",
      usualRoleName: "Server",
      wageCents: 0,
    });
    expect(introProfile({ name: "Sam", job: "Bartender", wage: "15" })).toMatchObject({
      ok: true,
      name: "Sam",
      usualRoleName: "Bartender",
      wageCents: 1500,
    });
    const badWage = introProfile({ name: "Sam", job: "", wage: "abc" });
    expect(badWage.ok).toBe(false);
  });
});
