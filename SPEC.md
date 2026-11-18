# Tip Tracker — Product Spec (v1)

**Status:** Approved 17 November 2026. Michael’s answers are written into this document. Build v1 from this file.
**Date:** 17 November 2026
**Reader:** Michael, a server at an Olive Garden in Bend, Oregon. The examples are meant to be checked against a night he actually worked.

This version folds in three rounds of direction:

- The original close-out log: hours, wage, tips, tip-out, history, profiles, on-device only.
- An earnings dashboard, on-device Insights, and a clear split between v1 and later.
- How Olive Garden-style tip-out actually works: a percent (he remembers about 4%, and is not sure whether the base is sales or tips), a job title on every shift, and tip share that bussers and bartenders receive.

The 4% figure is a **starting guess the user can change**, not a claim about Olive Garden’s policy. The app always shows the base in words (“4% of sales” or “4% of tips”), because the base is the part he is unsure about. It stays fully editable per role, because the percent varies by job.

### Approved answers (17 November 2026)

These override anything earlier in the drafting notes. Open questions that are not in this list use the defaults already written in the sections below.

1. **Server tip-out** stays 4% of sales on a new Server role, and it is fully editable per role.
2. **Week start** defaults to Wednesday (his restaurant’s week). Each profile can change it.
3. **Lunch** is a start before 4:00pm. A **double / all-day** is a shift **longer than 8 hours** (an 8-hour shift is a single). The label is “Double / all-day”. Either one is still correctable on the shift.
4. **Tip-out settlement.** Sometimes tip-out is paid in cash, sometimes it is taken from the paycheck. Each role has a setting, “Tip-out paid in cash” or “Taken from paycheck”, and each shift can override it. The cash-tonight versus paycheck split uses that choice. Tip share is still counted as cash.
5. **PIN or Face ID** stays in v1.1. v1 relies on the phone’s own passcode.

---

## 1. Roadmap

v1 is the close-out notebook: log a real shift in a few taps, keep it forever on the phone, and say — in numbers and in plain sentences — what actually paid. Later versions add tax paperwork, a lock, a backup file, and charts. Nothing on this list needs an account.

| Feature | When | Why |
| --- | --- | --- |
| Log a shift: date, start/end **or** total hours (overnight supported), base hourly wage, guest tips as one total **or** cash and card | v1 | This is the close-out. Without it there is no app. |
| Job title on every shift (Server, Bartender, Busser, Host, plus names he adds), shown as a small label | v1 | A server and a busser on the same phone do not fill in the same form. The title is how the form decides what to show. |
| Tip-out as a flat amount, a percent of sales, or a percent of tips. Default is per role. A new Server role starts at **4% of sales**, editable | v1 | This is how he tips out. A flat dollar box alone would make him do the percent in his head every night. |
| Tip share received, with an optional “from whom.” Hidden for servers. Tip-out hidden by default for bussers, bartenders, and hosts | v1 | Support roles mostly receive tip-outs. Servers mostly pay them. Both happen sometimes, so the quiet one is one tap away. |
| Quick entry: remember usual role, usual wage, and usual tip-out people and amounts or percents | v1 | The fast path should be three numbers: hours, tips, and sales. Everything else is already filled in. |
| History kept until he deletes one shift, one profile’s shifts, or all data | v1 | His requirement. The app never expires old shifts. |
| Multiple profiles, each with its own shifts, roles, wage, and settings | v1 | Shared phone, or a second job. |
| Earnings dashboard. Real hourly = (wages + tips − tip-outs) ÷ hours | v1 | This is the number the app exists to show. “Tips” here means guest tips plus tip share received. |
| Week, month, custom range, and all-time totals, plus a by-weekday breakdown | v1 | So he can see the shape of a week without waiting for Insights to have enough nights. |
| Insights: on-device, rule-based sentences for week, month, and all-time | v1 | Plain language for “which days, which meal, and whether doubles are worth it,” with a minimum sample before any claim. |
| Notes on a shift | v1 | One optional line (“patio closed”). It is not part of any formula. |
| Lunch / dinner and double / all-day, inferred from start time and length, with an optional one-tap correction. Lunch is a start before 4:00pm. A double / all-day is longer than 8 hours | v1 | Insights needs these, and inference means the fast path does not gain two required fields. |
| Tip percent of sales, shown only when sales was entered | v1 | Sales is already on the shift when tip-out is a percent of sales. The percent is one division, hidden when sales is blank. |
| Dark mode, following the phone, with a light/dark override | v1 | The form is used after close. |
| Free-form shift tags (banquet, patio, training, and labels he invents) | v1.1 | Meal and double corrections cover Insights in v1. Open-ended tags are a second organizing system. |
| Tax-time export: CSV and PDF | v1.1 | Needed in January, not in the parking lot. Sharing and a printable layout are their own slice of work. |
| Charts of earnings over time | v1.1 | v1 already ranks days and meals in sentences and a weekday list. Charts are another view of the same numbers. |
| Backup and restore by a file he exports and keeps himself | v1.1 | The phone holds the only copy. A file he stores himself does not add an account. |
| Optional PIN or Face ID / fingerprint lock, per profile | v1.1 | Profiles separate two people’s books; they do not hide them. A lock needs a PIN fallback and OS biometrics, and v1 can rely on the phone’s own lock. |
| Currency other than US dollars | v1.1 | He is paid in dollars. The money fields are built so a later currency symbol is a setting, not a rewrite. |
| Savings goals | v2 | A goal with money set aside is a different job from logging a shift. It needs its own balance, and it would crowd the close-out form. |
| Backup to iCloud or Google Drive | v2 | That puts wages and tips on a company’s servers. The file export comes first. Privacy tradeoff is in section 10. |
| AI theme generator: a prompt in Settings that returns a palette and a polka dot, gradient, or two-tone style | Later, after a backend | It waits until the cloud-backup backend exists, so the model key never ships in the app. Colors and styles only. Section 10. |
| Cloud-written Insights (a language model rewriting the sentences) | Not planned | The on-device sentences already state the result. Offering a cloud rewrite would send earnings off the phone. The tradeoff is written in section 8 in case he ever wants it anyway. |
| Accounts, sync, a combined “all profiles” dashboard, overtime, house card fees, scheduling | Not in this product’s current scope | They either move data off the device or answer a question this ledger does not ask. |

---

## 2. Product summary

Tip Tracker is a phone app for restaurant servers, bartenders, bussers, and hosts to write down a shift when they get off work and see what that shift, this week, and this month actually paid.

The person using it is tired, often one-handed, and standing in a parking lot or a break room. For a server whose usual role, wage, and tip-out rule are already saved, the typed part of a normal night is **hours, guest tips, and sales**. The app then answers:

- What did I take home for this shift?
- What was my real hourly rate after tip-out?
- Which days, and which kinds of shifts, are worth working?

It is a personal record on that phone. It is not payroll, not the restaurant’s tip-pool system, and not tax advice.

### Who a profile is

A profile is one set of books.

- Two people share a phone (Michael’s Olive Garden shifts, a roommate’s bar shifts).
- One person has two jobs (Olive Garden and a second restaurant).

Each profile has its own shifts, roles, default wage, tip-out defaults, and settings. Switching profiles switches every tab. There is no combined total across profiles in v1.

A profile is a filing system. It is not a lock. The phone’s own passcode is the v1 protection. A per-profile PIN or biometric lock is v1.1 (section 10).

### Roles

Every shift has one job title. The title is a small label on the shift (“Server”, “Busser”) and it chooses which fields start open.

| Starting role | What the form opens with | Tip-out default |
| --- | --- | --- |
| Server | Guest tips and tip-out. Tip share is tucked behind “I also received tip share.” | 4% of sales. Labeled as a guess he should fix. |
| Bartender | Guest tips and tip share received. Tip-out is tucked behind “I also tipped someone out.” | None. |
| Busser | Same posture as Bartender. | None. |
| Host | Same posture as Bartender. | None. |

He can rename these, delete them, add his own (“To-go”, “Runner”, “Expo”), and set each one’s posture:

- **I tip out** — tip-out is open, tip share is hidden until he asks for it.
- **I receive tip share** — tip share is open, tip-out is hidden until he asks for it.
- **Both** — both are open.

Posture is a default for the form, not a rule that forbids either number. A bartender who occasionally tips out the barback can open the field on that shift.

### What “take-home” and “real hourly” mean

Oregon does not use a tip credit. The wage he types is his real base hourly rate. Tips sit on top. The app does not model a lower “tipped minimum,” overtime, or a house processing fee.

```
tips       = guest tips + tip share received
take-home  = wages + tips − tip-outs
real hourly = take-home ÷ hours
```

That is the dashboard formula, written out. Guest tips are what his own tables (or bar guests) left. Tip share is money other staff tipped out to him. Tip-outs are money he paid out.

Cash may be in his pocket tonight and card tips may arrive on the paycheck. Take-home still adds them together, because the question is what the shift earned. A cash-versus-paycheck split is an extra display only when he split cash and card. See section 7.

---

## 3. Recommended tech stack

**Expo (React Native) + TypeScript + on-device SQLite (`expo-sqlite`).** That assumption still holds.

| Choice | Why |
| --- | --- |
| One React Native codebase | The release targets are the Apple App Store and Google Play. The UI is forms, lists, and sentences. Two native apps would double the work. |
| Expo | Expo Go is how the app gets onto a real phone while it is being built. Store builds can use EAS later without leaving that workflow. |
| TypeScript | The money math has to be obviously correct. A pure calculation module, with no UI imports, is the test surface. |
| `expo-sqlite` | Shifts live for years, per profile, with repeating tip-out lines, tip-share lines, and roles. Saves are transactions. A server working five shifts a week for twenty years is on the order of 5,000 shifts. Small, but it is a ledger. |
| No server and no account | Data stays on the device. Insights are arithmetic and sentence templates in the app, not a model call. |
| Jest on the pure functions | The fixtures in section 7 are the first tests. |

Navigation is `expo-router`. Styling is React Native `StyleSheet` and a small light/dark theme. No component library in v1. Screens talk to a repository module, never to SQL. The schema has a `user_version` migration from the first release.

### Alternatives considered

| Alternative | Why it is not the v1 choice |
| --- | --- |
| SwiftUI and Kotlin, separately | Best native feel. Two apps to keep in sync for a ledger. |
| Flutter + SQLite | A sound cross-platform stack. Expo stays because it is the working assumption, TypeScript keeps the money tests in the same language as the UI, and Expo Go is the phone workflow. |
| AsyncStorage or one JSON file | The volume would fit. Tip-out lines, per-role defaults, and “delete this profile” are relational, and rewriting one JSON blob is an easy way to lose a year of shifts. |
| A backend and accounts | Breaks “data stays on the device,” and adds a password-reset story he did not ask for. |
| A cloud language model for Insights | Sentence templates already say the result. A model would send earnings off the phone. See section 8. |
| A progressive web app | Does not meet an App Store and Play release plan. |

No analytics, crash reporter, ads, or in-app purchases in v1. No network permission. Money and durations are integers, never binary floats.

---

## 4. Design principles

- **Three numbers on a normal server night.** Role, wage, and tip-out rule are already filled. He types hours, guest tips, and sales, then Save.
- **The percent shows its base.** The preview reads “4% of sales = $48.00,” never a bare “4%.”
- **Support roles are not shown a server form.** A busser sees tip share, not a sales-based tip-out, until he opens it.
- **Thumb zone.** Save and the live total sit at the bottom. Delete does not sit next to Save.
- **Large targets.** At least 44pt. Money and hours open the numeric keypad.
- **Show the math while he types.** Hours, tip-out, net tips, take-home, real hourly.
- **Insights stay quiet until the sample is big enough.** A single great Friday does not become “Fridays pay best.”
- **Dark mode.** Follows the phone. Settings can force light or dark.
- **Empty states are the real first run.** No demo shifts ship in the app.

**Default date.** If the phone’s local time is before 4:00am, a new shift’s date defaults to yesterday. Otherwise it defaults to today. He can change it. A Friday close logged at 12:40am is still Friday.

---

## 5. Screens

Bottom tabs for the active profile: **Home · History · Summary · Settings**.

Log shift is a full-screen form, not a tab. Edit uses the same form. There is no all-profiles view in v1.

### 5.1 First launch

Shown only when there are zero profiles.

**Fields**

- Profile name. Placeholder “Olive Garden”. A job or a person. 1–40 characters.
- Usual role. Chips: Server (selected), Bartender, Busser, Host. This is the role that will be selected on the next shift. All four roles are created either way.
- Default hourly wage. Required. Used for every role unless he later sets a wage on a specific role.
- Week starts on. Default Wednesday.

Under the role chips, one line: “Server tip-out starts at 4% of sales. That’s a guess — change the percent or switch it to tips in Settings if your restaurant does it differently.”

**Actions**

- Continue. Creates the profile, the four roles, the Server tip-out default (4% of sales, no recipient name), sets the active profile, opens Home.
- A blank name or a blank wage does not continue.

No account, no email, no notification prompt.

### 5.2 Home

**Shows**

- Active profile name, and a profile switcher when more than one exists.
- **Log shift** as the primary button.
- This week’s earnings dashboard for the active profile: take-home as the large number, then real hourly, hours, and shift count. The card says, in small type, “Real hourly = (wages + tips − tip-outs) ÷ hours.”
- One pace line under that card. It compares this week’s take-home so far with his usual week at the same point. The sentence is specified in section 7.14.
- A tip jar in the top-right corner of Home, History, Summary, and Settings, unless he turns it off. Tapping it opens the sheet in section 5.2.1.
- The latest shift: weekday, date, role label, hours, take-home. Tap opens it.

**Empty**

“No shifts yet. Log tonight when you clock out.” The week card does not show $0.00/hour. It shows “No shifts this week.” The pace line still shows. With fewer than two earlier weeks it says “Log a couple of weeks to see your pace.”

### 5.2.1 Tip jar

A small jar in the top-right of the main tabs. It fills toward the weekly take-home goal for the current week. The week uses the profile’s week start (default Wednesday). Take-home is wages + tips − tip-outs, the same total as the dashboard.

- No goal yet: the jar is empty. Tapping it asks him to set one.
- With a goal: the sheet says “$520 of $800”, how much is left, the pace line, and whether he is on track for the goal (“On track to hit $800”). He can change the goal there.
- The fill animates. If the system asks for less motion, the level changes without animation.
- The first time the jar reaches the goal in a week, a short sparkle plays once. The same week does not celebrate again. Less motion skips the sparkle and still counts the week as celebrated.
- Settings has “Show tip jar”, on by default, saved on the profile. Off hides the icon. The pace line on Home stays.
- Below the weekly jar, the sheet lists savings goals. Short-term bars, then long-term bars. That part is section 5.2.2.

### 5.2.2 Savings goals

Separate from the weekly take-home goal. A savings goal fills only from money he sets aside. Logged wages and tips never move into it.

Each goal, per profile: a name (“New phone”, “Emergency fund”, “June trip”), a target amount, an optional target date, a type (short-term or long-term), and a weekly set-aside. If the date is within about three months, the form suggests short-term. He still picks.

Each week, using the profile’s week start, the tip jar sheet asks “Set aside $40 for New phone this week?” He can change that week’s amount, confirm, or skip. Nothing is added until he confirms. Skip means not this week. He can also add money, withdraw, or set the saved balance from the goal’s screen. Every one of those writes a history line. The balance cannot go below $0.

The weekly set-aside, the target amount, the target date, and the type can be edited any time on that screen. The pace line uses the numbers on the screen, so it changes as soon as he edits them, and again when he saves.

If there is a target date and the goal is not reached: “About $95/week to hit it by Jun 1.” Then either “This week’s set-aside is on track” or “Set-aside is short of that pace.” Weeks are counted from this week through the week of the date. A passed date says the date has passed and what is left. No date means no pace line.

The same bars appear on a Goals card on Summary. Reaching the target says “You reached …”, once until the balance drops below the target and reaches it again. Less motion keeps that as plain text. He can mark a goal complete, archive it, or delete it after a confirm. Complete and archived goals are not asked for a weekly set-aside. Delete-all removes every goal and its history with the shifts.

### 5.3 Log shift / Edit shift

One scroll. The live strip and Save stay pinned.

**Always on the form**

| Field | Required | Notes |
| --- | --- | --- |
| Date | Yes | Civil date. Default from the 4:00am rule. Today or any past date. Tomorrow and later are rejected. |
| Role | Yes | Chips from this profile’s roles, plus the last-used role already selected. The chip is the small label that will show on the shift. |
| Hours | Yes | Segmented control: **Start & end** or **Total hours**. Only the active one is on screen. |
| Start and end | If clock | Time of day, to the minute. End earlier than start means the shift crossed midnight. The date does not change. |
| Total hours | If duration | Decimal hours (`6.5`) or hours and minutes. Stored as whole minutes. |
| Hourly wage | Yes | Prefilled from the role’s wage, or from the profile wage if the role has none. |
| Save as usual wage | No | Shown only when the wage differs from that role’s usual wage. Off until he taps it. |
| Guest tips | Yes, may be $0 | **Total** or **Cash & card**. Default Total. Blank saves as $0.00. |
| Note | No | Behind “Add a note.” One text field, 500 characters. Not used in any calculation. |

**Server path (posture “I tip out”)** — open by default

| Field | Required | Notes |
| --- | --- | --- |
| Sales | Required if any tip-out line is a percent of sales. Otherwise hidden behind “Add sales.” | Blank is not zero. Zero is a typed $0. |
| Tip-out | Yes, may be $0 | A live preview of the role’s usual rule, for example “4% of sales = $48.00” or “Busser 2.5% of sales ($30.00), Bar 1.5% of sales ($18.00).” |
| I also received tip share | No | Closed by default. Opens an amount and optional “from whom” rows. |

**Support path (posture “I receive tip share”)** — open by default

| Field | Required | Notes |
| --- | --- | --- |
| Tip share received | Yes, may be $0 | Prominent. Blank saves as $0.00. |
| From whom | No | Optional rows, each a name and an amount. If rows exist, the tip-share total is their sum. |
| I also tipped someone out | No | Closed by default. Opens the same tip-out editor servers see. Sales stays hidden until a percent-of-sales line needs it. |

**Both** opens guest tips, tip-out, and tip share.

**Editing the tip-out for this shift only**

- Change the percent.
- Switch the base: **Sales**, **Tips**, or **Dollar amount**.
- Add or remove people (Busser, Bar, Host, or a typed name). Each person is one line: a percent of the chosen base, or a dollar amount.
- “Save as usual for Server” writes these lines onto the role, and also writes the shift’s tip-out settlement (cash or paycheck) onto the role. Off by default. A one-off night (he covered a different tip-out) must not change tomorrow’s prefill.
- The next new shift uses the role default, not last night’s one-off override.

**How this shift’s tip-out was settled**

On the tip-out block, two choices, prefilled from the role: **Tip-out paid in cash** or **Taken from paycheck**. This is a per-shift override. It does not change take-home. It changes only the cash-tonight versus paycheck split in section 7.10. The question is on the form whenever tip-out is open, because the two restaurants habits are both common.

Switching the role on a shift that he has not edited yet swaps in that role’s wage and tip-out or tip-share defaults. If he has edited them, keep his edits and ask: “Server usually tips out 4% of sales. Use that?”

**How lunch, dinner, and doubles get on the shift**

Not on the fast path.

- If he entered a start time, the meal is inferred: start before the profile’s cutoff is lunch, at or after the cutoff is dinner. Default cutoff is 4:00pm.
- If he entered only a length, the meal is unknown until he picks one.
- A shift longer than the double threshold is a double / all-day. Default threshold is 8 hours. An 8-hour shift is a single. Under or equal to the threshold is a single.
- “Fix how this shift is counted” opens three optional controls: Lunch, Dinner, or Leave blank; and Double / all-day, Single, or Decide from the hours. Choosing one stores an override. Leaving them alone stores “infer.”

**Live strip**

Hours, tip-out dollars, net tips, take-home, real hourly (an em dash if hours are 0).

**Actions**

- Save. Validates, writes the shift and its snapshot, opens the shift detail.
- Cancel. If he changed anything, “Discard this shift?”
- Edit only: Delete, confirmed with the date. Irreversible.

**Validation**

- Blank wage: “Enter your hourly wage.”
- Clock times equal: “End time matches start time. If you worked a full 24 hours, use Total hours.”
- Blank or 0 duration: “Enter how long you worked.”
- Duration over 24 hours: blocked. Clock mode cannot represent 24 hours, because a full loop looks like 0. The longest clock shift is 23 hours 59 minutes.
- Over 14 hours and up to 24: “That’s a long shift. Save it if it’s right.” Save is allowed.
- Date after today: “That date is in the future.”
- Negative money: “Amount can’t be negative.”
- Percent of sales with sales blank: “Enter sales to calculate this tip-out, or switch it to a dollar amount.”
- Sales of $0 with a percent-of-sales tip-out: allowed, tip-out computes as $0, with “Sales are $0, so this percent tip-out is $0.”
- Percent over 100: blocked. Over 20: “That’s a high tip-out percent. Save it if it’s right.”
- Tip-out greater than tips: “Tip-out is more than your tips. Net tips will be negative.” Save is allowed. This is a normal bad night when the tip-out is a percent of sales.
- Guest tips over $5,000, sales over $20,000, or wage over $150/hour: “Double-check that amount.” Save is allowed.
- A named line with a blank amount: “Enter the amount.” A line with an amount and no name: “Who was this for?”
- Two shifts on the same date are both kept.

### 5.4 Shift detail

- Role label, weekday, date.
- Hours, and either the clock times or “Total hours entered.” If the times crossed midnight, say so.
- Meal and double / all-day, each marked “from start time,” “from length,” or “you marked this.”
- Wage and wage earnings.
- Guest tips. Cash and card lines when he used them.
- Tip share, including “from whom” when he entered it.
- Sales, when present, and tips as a percent of sales (guest tips ÷ sales).
- Tip-out lines with the rate that was used: “Bar · 4% of sales · $48.00,” or “Busser · $15.00.”
- Net tips, take-home, real hourly, tips per hour.
- Note, if any.
- When guest tips were split into cash and card, a second breakdown (section 7.10) that follows this shift’s tip-out settlement. Hidden when guest tips were a single total. The screen says whether tip-out was paid in cash or taken from the paycheck.

**Actions:** Edit. Delete, with “Delete the Server shift on Fri, Nov 14? This can’t be undone.”

### 5.5 History

- Active profile only, newest first, grouped by month.
- Each row: weekday and date, the role label, hours, take-home, and net tips in smaller type.
- Tap opens the shift.
- No search in v1.
- Sort: shift date descending, then start time descending (duration-only shifts after timed shifts that day), then created time descending.
- Empty: “No shifts yet.”

Nothing is archived. Rows stay until he deletes them.

### 5.6 Summary

This is the earnings dashboard for a range, plus Insights.

**Range:** This week · This month · All time · Custom.

Custom asks for an inclusive start and end. If the end is before the start: “End date is before the start date,” and no totals.

This week uses the profile’s week-start day. This month is the calendar month. All time is every shift on the profile.

**Dashboard totals**

- Shifts, hours
- Wage earnings
- Guest tips, tip share, and their sum (tips)
- Tip-out
- Net tips
- Take-home
- Real hourly, with the formula in small type
- Tips per hour (net tips ÷ hours)

Rates are blank when total hours are 0, including a week with no shifts. Sums on an empty range show $0.00 and “No shifts in this week.” Real hourly is weighted: total take-home ÷ total hours, not the average of each shift’s rate.

**By day of week**

Seven rows, ordered from the week-start day, including days with no shifts.

Each row: weekday, shift count, hours, take-home, average take-home per shift, real hourly. This is a list. Charts are v1.1.

**Tip-out by person, and tip share by person**

For the same range. Names are trimmed and matched without case, so “bar” and “Bar” add together. The display uses the capitalization from the most recent line.

A tip-out that was a single unlabeled amount goes to “Unspecified” when it is more than zero. It is not guessed onto Busser or Bar. The same rule applies to tip share with no “from whom.”

A block is hidden when the range has none of that money.

**Insights**

Directly under the totals, for the selected range. Specified in section 8. Custom ranges of 21 days or more use the month rules. Shorter custom ranges use the week rules.

### 5.7 Settings

**This profile**

- Rename.
- Default hourly wage. New roles inherit it. Does not rewrite old shifts or roles that have their own wage.
- Week starts on. Default Wednesday for a new profile.
- Show tip jar. On by default. Hides the icon in section 5.2.1. Does not hide the pace line.
- Lunch cutoff. Default 4:00pm. “Shifts starting before this count as lunch. This does not change your totals.”
- Double / all-day threshold. Default 8 hours. “Shifts longer than this count as a double / all-day unless you mark one otherwise. An 8-hour shift is a single when this is 8 hours.”
- Roles. Add, rename, reorder, delete. Deleting a role keeps the name already saved on old shifts. The last role cannot be deleted. Each role has:
  - Posture: I tip out / I receive tip share / Both.
  - Usual wage, optional. Blank means “use the profile wage.”
  - Tip-out settlement: **Tip-out paid in cash** or **Taken from paycheck**. New roles start at paid in cash. A shift can override it.
  - Usual tip-out: zero or more lines, all of one kind. Either every line is a dollar amount, or every line is a percent of sales, or every line is a percent of tips. A role is not “2% of sales and $5” and not “2% of sales and 1% of tips.” Different people can still have different numbers: Busser 2.5% of sales and Bar 1.5% of sales, or Busser $10 and Bar $5. The person on a line can be blank when there is only one line.
- Delete all shifts on this profile. Confirm with the count. The profile and its roles remain.
- Delete this profile, its shifts, and its roles. If it was the only profile, this is the same as deleting all data and returns to first launch.

**All profiles**

- List, tap to switch, add another. Add uses the same fields as first launch.

**App**

- Appearance: System (default), Light, Dark.
- About: version, plus “Tip Tracker is a personal record of what you enter. It is not tax, payroll, or legal advice.” And the backup sentence from section 9.
- Delete all data. A separate screen that states how many profiles and shifts will be removed, then a second button labeled “Delete everything.” Irreversible. Returns to first launch.

---

## 6. Data model

SQLite, one private file. Money is integer cents. Percents are integer basis points (400 = 4.00%, 350 = 3.50%, 425 = 4.25%). Durations are integer minutes. Ids are UUID strings. Timestamps are ISO-8601 UTC. Shift dates and clock times are civil values, not instants.

Deletes are hard, in a transaction. The app never purges on a timer.

Computed money on a shift is a snapshot written at save. Opening the app does not recompute history. Changing a role’s usual tip-out does not change shifts already saved.

### 6.1 `profile`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `name` | TEXT | Required. Trimmed. 1–40 characters. |
| `default_wage_cents` | INTEGER | Required. Cents per hour. ≥ 0. |
| `week_starts_on` | INTEGER | Required. 0 = Sunday … 6 = Saturday. A new profile defaults to 3 (Wednesday). |
| `lunch_cutoff_minutes` | INTEGER | Required. 0–1439. Default 960 (4:00pm). |
| `double_threshold_minutes` | INTEGER | Required. Default 480 (8 hours). Allowed range 360–720 (6–12 hours). A shift is a double / all-day only when its length is **greater than** this value. |
| `last_role_id` | TEXT | Null until the first save. The role preselected on the next new shift. Set null if that role is deleted. |
| `weekly_goal_cents` | INTEGER | Null until he sets a weekly take-home goal. When set, greater than 0. |
| `show_tip_jar` | INTEGER | Required. 1 or 0. Default 1. |
| `tip_jar_celebrated_week` | TEXT | Null, or the week-start date of the last goal celebration. One celebration per week. |
| `created_at`, `updated_at` | TEXT | Required. |

### 6.2 `role`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `profile_id` | TEXT | Required. Foreign key → `profile`. Cascade delete. |
| `name` | TEXT | Required. Trimmed. 1–24 characters. Unique per profile, case-insensitive. |
| `posture` | TEXT | Required. `tips_out`, `receives_share`, or `both`. |
| `default_wage_cents` | INTEGER | Null means use the profile wage. |
| `tip_out_settlement` | TEXT | Required. `cash` (tip-out paid in cash) or `paycheck` (taken from the paycheck). New roles start at `cash`. |
| `sort_order` | INTEGER | Required. |
| `created_at`, `updated_at` | TEXT | Required. |

### 6.3 `role_tip_out_default`

The usual tip-out for new shifts on this role. Not used for roles that have no rows (the starting Bartender, Busser, and Host).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `role_id` | TEXT | Required. Foreign key → `role`. Cascade delete. |
| `label` | TEXT | Null when it is a single unnamed rule (“4% of sales”). Otherwise the person (“Busser”). 1–30 characters. |
| `kind` | TEXT | Required. `flat`, `percent_of_sales`, or `percent_of_tips`. |
| `amount_cents` | INTEGER | Set for `flat`. Null otherwise. ≥ 0. |
| `basis_points` | INTEGER | Set for percent kinds. Null for `flat`. 0–10000. |
| `sort_order` | INTEGER | Required. |

Every row on one role shares the same `kind`. A role is all dollars, all percent of sales, or all percent of tips. Enforced when saving settings. Different people can have different percents or different dollar amounts.

### 6.4 `shift`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `profile_id` | TEXT | Required. Foreign key → `profile`. Cascade delete. |
| `role_id` | TEXT | Null if that role was later deleted. |
| `role_name` | TEXT | Required. Copy of the name at save time. This is the label history shows. |
| `shift_date` | TEXT | Required. `YYYY-MM-DD`. The date he picked, including when the clock end falls on the next morning. |
| `hours_mode` | TEXT | `clock` or `duration`. |
| `start_minutes`, `end_minutes` | INTEGER | Null unless `clock`. 0–1439. Must differ. |
| `duration_minutes` | INTEGER | Required. 1–1440. Canonical length, written at save. |
| `wage_cents` | INTEGER | Required. The hourly wage used. Later edits to the role do not change it. |
| `tips_mode` | TEXT | `total` or `split`. |
| `tips_total_cents` | INTEGER | Set if `total`. Null if `split`. ≥ 0. Guest tips only. |
| `cash_tips_cents`, `card_tips_cents` | INTEGER | Set if `split`. Null if `total`. ≥ 0. |
| `sales_cents` | INTEGER | Null if he did not enter sales. ≥ 0 when set. Not the same as blank. |
| `tip_share_mode` | TEXT | `none`, `total`, or `itemized`. |
| `meal_override` | TEXT | Null (infer or unknown), `lunch`, or `dinner`. |
| `double_override` | INTEGER | Null (infer), 0 (single), or 1 (double / all-day). |
| `tip_out_settlement` | TEXT | Required. `cash` or `paycheck`. Copied from the role when the shift is opened, then kept if he overrides it on this shift. |
| `notes` | TEXT | Null if blank. Max 500. |
| `guest_tips_cents` | INTEGER | Snapshot. |
| `tip_share_cents` | INTEGER | Snapshot. ≥ 0. |
| `gross_tips_cents` | INTEGER | Snapshot. Guest tips + tip share. |
| `tip_out_total_cents` | INTEGER | Snapshot. ≥ 0. |
| `wage_earnings_cents` | INTEGER | Snapshot. |
| `net_tips_cents` | INTEGER | Snapshot. May be negative. |
| `take_home_cents` | INTEGER | Snapshot. May be negative. |
| `created_at`, `updated_at` | TEXT | Required. |

Constraints:

- `clock` has both times, and they differ. `duration` has both times null.
- `total` guest tips: `tips_total_cents` set, cash and card null. `split` is the reverse.
- `tip_share_mode = none` means `tip_share_cents = 0` and no tip-share lines.
- `itemized` tip share has at least one line, and `tip_share_cents` equals the sum.
- If any tip-out line is `percent_of_sales`, `sales_cents` is not null.
- Every tip-out line on one shift shares one kind.

Index: `(profile_id, shift_date)`.

### 6.5 `tip_out_line`

What this shift actually used. Copied from the role default at save, then edited if he changed it. Later edits to the role default do not flow backward.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `shift_id` | TEXT | Required. Foreign key → `shift`. Cascade delete. |
| `label` | TEXT | Null for an unnamed amount. |
| `kind` | TEXT | `flat`, `percent_of_sales`, or `percent_of_tips`. |
| `basis_points` | INTEGER | Null for `flat`. Otherwise the rate used, even if he later changes the role. |
| `amount_cents` | INTEGER | Required. The dollars, already rounded. ≥ 0. |
| `sort_order` | INTEGER | Required. |

`tip_out_total_cents` on the shift equals the sum of these rows. A shift with no tip-out has no rows and a total of 0. It does not have a fake $0 line.

### 6.6 `tip_share_line`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `shift_id` | TEXT | Required. Foreign key → `shift`. Cascade delete. |
| `label` | TEXT | Null if he did not say from whom. Otherwise 1–30 characters. |
| `amount_cents` | INTEGER | Required. ≥ 0. |
| `sort_order` | INTEGER | Required. |

### 6.7 App key/value

| Key | Value |
| --- | --- |
| `active_profile_id` | UUID. |
| `appearance` | `system`, `light`, or `dark`. |

### 6.8 `savings_goal` and `goal_entry`

A savings goal belongs to one profile. Deleting the profile deletes its goals. Delete-all deletes every goal.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | TEXT | Primary key. |
| `profile_id` | TEXT | Required. Foreign key → `profile`. Cascade delete. |
| `name` | TEXT | Required. Trimmed. 1–40 characters. |
| `target_cents` | INTEGER | Required. Greater than 0. |
| `target_date` | TEXT | Null, or a civil date. |
| `horizon` | TEXT | Required. `short` or `long`. |
| `weekly_set_aside_cents` | INTEGER | Required. ≥ 0. The usual amount for the weekly prompt. |
| `saved_cents` | INTEGER | Required. ≥ 0. Equals the sum of the history, never below 0. |
| `status` | TEXT | Required. `active`, `complete`, or `archived`. |
| `celebrated` | INTEGER | 1 after the balance has reached the target, until it drops below again. |
| `created_at`, `updated_at` | TEXT | Required. |

`goal_entry` is the history. `kind` is `set_aside`, `add`, `withdraw`, `adjust`, or `skip`. `amount_cents` is the positive amount for set-aside, add, and withdraw, the signed change for an adjustment, and 0 for a skip. `week_start` is set for the weekly confirm and the weekly skip, so the prompt is not shown again that week.

### 6.9 What is not stored

- Real hourly, tips per hour, and tip percent of sales. Divided at display time from the snapshot.
- The inferred meal and the inferred double. Derived on read from `start_minutes` or `duration_minutes`, the profile cutoffs, and the overrides. Changing the lunch cutoff changes Insights and the detail label. It does not change take-home.
- No user account, no device id for a backend, no sync cursor.

---

## 7. Calculations

Pure functions. Inputs are integers. Money results are integer cents. Formatting happens last.

**Rounding** to the cent, half away from zero, for a non-negative numerator `n` and a positive denominator `d`:

```
roundDiv(n, d) = (n + d/2) / d     # integer division
```

`d/2` is integer division too (for 60, half is 30; for 10000, half is 5000; for an odd `d`, half is truncated, which is acceptable because the only odd divisors here would be a shift length in minutes).

Negative net tips and negative take-home are differences of cents. They are not rounded again.

**Displayed real hourly**, in cents per hour:

```
roundDiv(take_home_cents * 60, duration_minutes)
```

Same shape for tips per hour, using `net_tips_cents`. Blank when minutes are 0.

**Do not average rates.** For any set of shifts:

```
real hourly   = sum(take_home_cents) / (sum(duration_minutes) / 60)
tips per hour = sum(net_tips_cents)  / (sum(duration_minutes) / 60)
```

Display those with the same `roundDiv(sum_cents * 60, sum_minutes)`.

**Civil dates.** `YYYY-MM-DD` is a calendar date. It is never parsed with `Date.parse` or `new Date("YYYY-MM-DD")`, which treat the string as UTC and can move the weekday. Weekday and month come from the calendar date as written.

**Clock times ignore daylight saving.** Duration is the clock difference, not elapsed UTC. Twice a year a shift crossing the change can be off by one hour versus a stopwatch. People mean “I worked 4 to 10.”

### 7.1 Hours

Duration mode: `duration_minutes` is the entered hours and minutes. A decimal `6.5` becomes `roundDiv(65, 10)` hours-to-minutes, implemented as `roundDiv(65 * 60, 10)` = 390. Reject results outside 1–1440.

Clock mode:

```
if end > start:  duration = end - start
if end < start:  duration = end + 1440 - start    # crossed midnight
if end == start: invalid
```

Friday 5:00pm → 12:30am is 450 minutes (7.5 hours) and stays Friday.

### 7.2 Wage earnings

```
wage_earnings_cents = roundDiv(wage_cents * duration_minutes, 60)
```

$16.50/hour × 6.5 hours = `roundDiv(1650 * 390, 60)` = 10725 cents = $107.25.

### 7.3 Guest tips

```
if tips_mode == total:  guest = tips_total_cents
if tips_mode == split:  guest = cash_tips_cents + card_tips_cents
```

Blank fields become 0 before this runs. The two modes cannot both be stored.

### 7.4 Tip share received

```
if mode == none:       tip_share = 0
if mode == total:      tip_share = the single amount
if mode == itemized:   tip_share = sum(line amounts)
```

### 7.5 Gross tips

```
gross_tips = guest_tips + tip_share
```

This is “tips” in the dashboard formula. A busser’s night with $0 from guests and $60 in tip share has $60 of tips.

### 7.6 Tip-out

Each line:

```
if kind == flat:
    amount = amount_cents
if kind == percent_of_sales:
    amount = roundDiv(sales_cents * basis_points, 10000)
if kind == percent_of_tips:
    amount = roundDiv(guest_tips_cents * basis_points, 10000)
```

**Percent of tips uses guest tips only.** It does not include tip share received. Tip share is other people’s money passed over; the app does not take a percent of it again unless he types a dollar tip-out.

Lines are rounded **each**, then added. 2% + 2% can differ from 4% by one cent. The total on the shift is the sum of the rounded lines, so the people add up to the tip-out he sees.

```
tip_out_total = sum(line amounts)
```

No lines means $0.

Worked percents:

- 4% of $1,200.00 = `roundDiv(120000 * 400, 10000)` = $48.00 exactly.
- 4% of $33.33 = `roundDiv(3333 * 400, 10000)` = $1.33.
- 4% of $180.00 guest tips = $7.20.

### 7.7 Net tips, take-home, real hourly, tips per hour

```
net_tips   = gross_tips - tip_out_total          # may be negative
take_home  = wage_earnings + net_tips            # may be negative
real hourly = take_home / hours                  # blank if hours are 0
tips per hour = net_tips / hours                 # blank if hours are 0
```

Real hourly is (wages + guest tips + tip share − tip-outs) ÷ hours.

**Tips per hour uses net tips**, after tip-out. Gross tips per hour is not shown, so two rates cannot disagree. Section 11 asks him to confirm.

### 7.8 Tip percent of sales

Shown on the shift and nowhere else in v1, and only when `sales_cents` > 0:

```
guest_tips / sales
```

Displayed to one decimal percent (18.4%). Uses guest tips, not tip share and not net tips. It is “what did my tables leave,” not “what did I keep.”

### 7.9 Period totals

S = shifts on the active profile whose `shift_date` is inside the inclusive range.

```
shifts        = count(S)
hours         = sum(duration_minutes) / 60
wage earnings = sum(wage_earnings_cents)
guest tips    = sum(guest_tips_cents)
tip share     = sum(tip_share_cents)
tips          = guest tips + tip share
tip-out       = sum(tip_out_total_cents)
net tips      = sum(net_tips_cents)
take-home     = sum(take_home_cents)
real hourly   = section 7.7 over those sums
tips per hour = section 7.7 over those sums
```

**This week.** `w` = week start. A new profile uses Wednesday. Start = the latest date on or before today whose weekday is `w`. End = start + 6 days.

### 7.14 Tip jar and pace

Both use take-home cents. The jar’s week is the same “this week” as the dashboard.

**Goal.** `fill` = 0 when take-home is 0 or negative, otherwise take-home ÷ goal, never drawn above 1. Remaining = goal − take-home, and it can be more than the goal when take-home is negative. Met when take-home ≥ goal. No goal means an empty jar and no goal sentence.

**Pace.** Offset = days from the week start through today, 0 on the first day. This week’s number is take-home of shifts from the week start through today.

A prior week counts only when it has at least one shift on or before that same offset. Weeks with shifts only later in the week are skipped. Use the latest 8 such weeks. With fewer than 2, the line is “Log a couple of weeks to see your pace.”

Otherwise compare this week’s number with the average of those weeks (half away from zero).

- More than every one of at least four of those weeks: “Best week in a month.”
- Within $5.00 of the average: “Right on pace.”
- Ahead: “$60 ahead of your usual week.”
- Behind, and today is not the last day of the week: “$40 behind your average Thursday-to-date, a good Friday catches you up.” The weekday names are today and tomorrow.
- Behind on the last day of the week: “$40 behind your usual week.”

**Goal pace**, only when a goal is set. Elapsed days = offset + 1. Projected = this week’s take-home × 7 ÷ elapsed days, half away from zero.

- Already met: “You hit $800.”
- Projected ≥ goal: “On track to hit $800.”
- Otherwise: “Behind the pace for $800.”

Whole-dollar amounts are written without cents.

### 7.15 Savings goals

Saved cents come only from confirmed entries. Take-home is not an input.

- Progress fill = saved ÷ target, drawn no higher than 1. Percent is that ratio rounded to the nearest whole number, capped at 100. Remaining = target − saved, or 0 when saved is ahead.
- A target date on or before today that is not yet met: “The date has passed.” No on-track line.
- Otherwise, weeks = the number of week-starts from this week through the target date’s week, at least 1. Needed per week = remaining ÷ weeks, half away from zero. “About $95/week to hit it by Jun 1.” On track when the weekly set-aside is at least that amount.
- Editing the target, the date, the saved balance, or the weekly set-aside uses those new numbers the next time this is calculated.
- The weekly prompt is shown for an active goal with a set-aside above $0 when this week has neither a set-aside entry nor a skip. Confirming writes a set-aside. Skipping writes a skip. A $0 confirm is a skip.

**This month.** First through last civil day of today’s month.

**All time.** No date filter.

**By weekday.** Partition S by the weekday of `shift_date`. Average take-home per shift = `sum(take_home) / count`, blank when the count is 0. A 4-hour lunch and a 7-hour close on different Fridays are each one Friday shift.

**Tip-out by person.** Sum of line amounts in S, grouped by trimmed case-insensitive label. Lines with a null label, and shifts with a positive total and no lines, add into Unspecified. Tip share by person uses the same grouping on `from whom`.

### 7.10 Cash tonight versus paycheck

Display only. Not stored as its own totals. Shown on the shift detail only when guest tips are `split`.

The shift stores `tip_out_settlement`, which starts as the role’s setting and can be overridden for that shift. Tip share is still counted as cash in both cases. The screen says which settlement was used. Take-home does not change. The two lines still add back to take-home.

**Tip-out paid in cash** (`cash`):

```
cash left tonight = cash_tips + tip_share - tip_out
paycheck          = wage_earnings + card_tips
```

**Taken from paycheck** (`paycheck`):

```
cash left tonight = cash_tips + tip_share
paycheck          = wage_earnings + card_tips - tip_out
```

Cash left and the paycheck may be negative. They are shown, not clipped. Week totals do not show this split, because shifts logged as one tip total have no cash figure and a partial sum would look complete when it is not.

### 7.11 Meal and double, for Insights and the detail label

```
if meal_override is set: use it
else if start_minutes is set:
    lunch if start_minutes < lunch_cutoff_minutes
    else dinner
else:
    unknown

if double_override is 1: double / all-day
if double_override is 0: single
else:
    double / all-day if duration_minutes > double_threshold_minutes
    else single
```

The default threshold is 480 minutes (8 hours). A shift of exactly 8 hours is a single. A shift of 8 hours 1 minute is a double / all-day. The label everywhere is “Double / all-day”, not “Double” alone.

Unknown meals are left out of the lunch-versus-dinner comparison. They still count in totals, weekdays, and doubles.

### 7.12 Fixtures

These are the v1 calculation tests.

**A. Server dinner, 4% of sales.**

| Input | Value |
| --- | --- |
| Date | Friday 14 Nov 2025 |
| Time | 4:00pm → 10:30pm |
| Role | Server |
| Wage | $16.50/hour |
| Guest tips | $40.00 cash + $140.00 card |
| Sales | $1,200.00 |
| Tip-out | 4% of sales (400 basis points), unnamed |
| Tip share | none |

| Result | Value |
| --- | --- |
| Hours | 6.5 (390 min). Meal: dinner (start equals the 4:00pm cutoff, so dinner). Not a double / all-day (6.5 hours is not longer than 8). |
| Wage earnings | $107.25 |
| Guest tips | $180.00 |
| Tip-out | $48.00 |
| Net tips | $132.00 |
| Take-home | $239.25 |
| Real hourly | $36.81 (`roundDiv(23925 * 60, 390)` = 3681 cents) |
| Tips per hour | $20.31 (`roundDiv(13200 * 60, 390)` = 2031 cents) |
| Tip % of sales | 15.0% |
| Tip-out settlement | Paid in cash (the starting role default). |
| Cash left tonight | $40 − $48 = −$8.00 |
| Paycheck | $107.25 + $140.00 = $247.25 |

The same inputs with settlement **Taken from paycheck** leave $40.00 cash tonight and a paycheck of $107.25 + $140.00 − $48.00 = $199.25. Take-home is still $239.25.

**B. Same clock times, flat tip-out, no sales.** Busser $15, Bar $10.

| Result | Value |
| --- | --- |
| Tip-out | $25.00 |
| Net tips | $155.00 |
| Take-home | $262.25 |
| Real hourly | $40.35 |
| Tips per hour | $23.85 |
| Tip % of sales | hidden |

**C. Overnight, no tips.** 5:00pm → 12:30am, wage $16.50.

| Result | Value |
| --- | --- |
| Hours | 7.5, weekday of the start date |
| Wage earnings and take-home | $123.75 |
| Real hourly | $16.50 |
| Tips per hour | $0.00 |
| Meal | dinner |

**D. Stiffed, percent of sales.** 5.0 hours, wage $16.50, guest tips $20.00, sales $875.00, tip-out 4% of sales.

| Result | Value |
| --- | --- |
| Tip-out | $35.00 |
| Net tips | −$15.00 |
| Wage earnings | $82.50 |
| Take-home | $67.50 |
| Real hourly | $13.50 |
| Tips per hour | −$3.00 |

**E. Busser.** 5.0 hours, wage $16.50, guest tips $0, tip share $60 from “Servers”, tip-out hidden.

| Result | Value |
| --- | --- |
| Gross tips | $60.00 |
| Take-home | $82.50 + $60.00 = $142.50 |
| Real hourly | $28.50 |
| Tips per hour | $12.00 |

**F. Each tip-out line rounds, then the lines add.** Sales $25.25. Two people at 2% of sales (200 basis points) each.

| Result | Value |
| --- | --- |
| Each line | `roundDiv(2525 * 200, 10000)` = $0.51 |
| Tip-out total | $1.02 |
| A single 4% line on the same sales | `roundDiv(2525 * 400, 10000)` = $1.01 |

The shift total is $1.02, the sum of the rounded lines, not the $1.01 a single 4% line would produce. A second check: Busser 2.5% and Bar 1.5% of $1,000.00 are $25.00 + $15.00 = $40.00, and that sum is the tip-out.

**G. Period weighting.** Fixture A plus a Saturday duration shift, 4.0 hours, wage $16.50, guest tip total $60, tip-out $0.

| Result | Value |
| --- | --- |
| Saturday wage | $66.00 |
| Saturday take-home | $126.00 |
| Together | 10.5 hours, take-home $365.25 |
| Period real hourly | `roundDiv(36525 * 60, 630)` = $34.79 |
| Not used | the average of $36.81 and $31.50 |

Friday holds fixture A only. Saturday holds the second shift.

**H. Not saved.** End time equal to start time. Duration of 0. Percent of sales with sales left blank. Percent of 150.

### 7.13 Edge cases

| Case | Behavior |
| --- | --- |
| End earlier than start | Crossed midnight. The saved date stays the date he picked. |
| End equal to start | Cannot save in clock mode. |
| Exactly 24 hours | Duration mode only. |
| Exactly 8 hours, threshold 8 hours | Single. A double / all-day must be longer than the threshold. |
| 8 hours 1 minute, threshold 8 hours | Double / all-day. |
| DST change during the shift | Clock difference. Can be off by one hour versus elapsed time. |
| Blank guest tips, blank tip share, blank flat tip-out | $0.00. |
| Blank sales when no percent-of-sales line | Stay null. Do not store $0. |
| Blank wage | Cannot save. |
| Wage $0 | Allowed. Take-home equals net tips. |
| Percent of tips when guest tips are $0 | Tip-out $0. |
| Tip-out greater than tips | Negative net tips. Warning. Saved. |
| Take-home negative | Shown. Not clamped at zero. |
| Summary with 0 hours | Sums may be $0. Rates are blank. |
| Two shifts, one date | Both kept. |
| Role default or role wage edited later | Old shifts keep their snapshots and `role_name`. |
| Role deleted | `role_id` null, `role_name` kept, label still shows. |
| Week-start, lunch cutoff, or double threshold edited | Changes Summary grouping and Insights labels. Does not rewrite snapshots. |
| “bar” and “Bar ” | One bucket in the person totals. |
| Formula change in a future app version | Does not rewrite snapshots unless a migration is written to do that on purpose. |
| Guest tips entered as both a total and a split | Only the selected mode is kept. |
| Support role, tip-out left hidden | No tip-out lines. Total $0. Sales not required. |
| Server, tip share left hidden | `tip_share_mode = none`. |

---

## 8. Insights

Insights reads shifts already on the phone and writes a few short sentences. The code is comparisons plus templates. It does not call a model, does not read the note text, and does not use the network.

Ranges:

- **This week**, and any custom range shorter than 21 days.
- **This month**, **all time**, and any custom range of 21 days or more.

Sentences appear under the dashboard totals for that range. They name the range (“this month”, “since Mar 2, 2026”, “this week”).

### 8.1 What it is allowed to claim

| Question | Metric | Minimum before a claim |
| --- | --- | --- |
| Which weekday pays best per hour? | Real hourly. Tie-break note if a different weekday has a higher average take-home per shift. | Month / all-time / long custom only. At least 3 shifts on each of at least two weekdays. A week cannot pass this, because it holds one Monday. |
| Does lunch or dinner pay more per hour? | Real hourly of inferred (or overridden) meals. | At least 3 lunch shifts and 3 dinner shifts in the range. |
| Are doubles / all-day worth it? | Real hourly of doubles / all-day versus singles, and average take-home per shift, both stated. A double / all-day is longer than the profile threshold (default 8 hours). | At least 2 doubles / all-day and 3 singles in the range. |
| Is the rate moving? | Real hourly versus the previous period. | Month: this month and the previous month each have at least 4 shifts. All time: the latest 28 days and the 28 days before that each have at least 4 shifts. Not shown for a week. |
| Which role pays more per hour? | Real hourly by `role_name`. | At least two roles in the range, each with at least 3 shifts. Skipped when he only uses one role. |

**About the same.** Two rates are a tie when the difference is under $1.00 or under 5% of the lower rate, whichever bar is higher. `max($1.00, 5% of the lower rate)`. A $0.40 edge is not a claim.

**Worth it, for doubles / all-day.** Doubles / all-day are “worth it on the hourly rate” when their real hourly is greater than the singles’ rate by more than the tie band. If the rates tie and a double / all-day’s average take-home is higher, the sentence says the hourly rate is about the same and the shift pays more because it is longer. If the double / all-day hourly rate is lower, the sentence says the extra hours are the weaker hours, even when the shift’s total is higher. It does not tell him to stop taking doubles.

**Small leader.** If the winning weekday has fewer than half as many shifts as the runner-up, and the runner-up has at least 6, add one clause that the runner-up is the steadier sample.

Unknown meals are excluded from the meal comparison and counted in a footnote only when the meal comparison itself is shown or attempted: “2 shifts had no start time and weren’t counted as lunch or dinner.”

### 8.2 How many sentences

Show every comparison that qualifies, up to four sentences, in this order: weekday, meal, double, trend, role. If all five qualify, drop the role sentence. A week never has a weekday ranking or a trend, so the cap rarely matters. The cap is so the screen stays a few lines.

When nothing qualifies, one sentence explains why, naming the closest miss (“1 lunch and 6 dinners — meals need at least 3 of each”). It does not list every failure separately.

A week that has shifts still gets a recap line, which is not a ranking:

“This week: 4 shifts, 23 hours, $742 take-home, $32.26 an hour. Day and meal rankings need several of the same kind of shift. Open Month or All time once they’re logged.”

A range with no shifts: “No shifts in this period.” No other Insights text.

### 8.3 Example sentences

Numbers below are illustrations of the templates, not a second set of fixtures. Tests should lock the template choice (which sentence pattern) for a given sample, and lock the figures against the calculation tests.

**Week, enough shifts to recap, not enough to rank**

> This week: 4 shifts, 23 hours, $742 take-home, $32.26 an hour. Day and meal rankings need several of the same kind of shift. Open Month or All time once they’re logged.

**Best day**

> Friday is your best day this month: $38.40 an hour across 5 shifts, about $6.10 more than Tuesday (4 shifts).

**Best day, with the take-home caveat**

> Per hour, Tuesday paid best this month ($41.20 an hour, 3 shifts). Saturday still brought home more per shift ($268 vs $164) because those shifts were longer.

**Steadier sample**

> Friday is highest this month at $40.10 an hour, from 3 shifts. Saturday has 12 shifts at $34.00 an hour and is the steadier result.

**Tie**

> Friday and Saturday are about the same this month: $34.20 and $33.60 an hour.

**Dinner beats lunch**

> Dinner paid more per hour this month than lunch: $36.20 (8 shifts) vs $24.10 (4 shifts). Lunch is a start before 4:00pm.

**All one meal**

> All 6 shifts this month were dinners (start at 4:00pm or later). There’s no lunch comparison. Change the lunch cutoff in Settings if a shift landed on the wrong side.

**Not enough meals**

> Not enough lunches to compare meals yet (1 lunch, 6 dinners). Insights waits for at least 3 of each.

**Doubles / all-day worth it on rate**

> Doubles / all-day were worth it on the hourly rate this month: $37.50 an hour (3 doubles / all-day) vs $31.00 (9 singles). A double / all-day also brought home more per shift ($410 vs $214).

**Doubles / all-day pay more in total, less per hour**

> Doubles / all-day brought home more per shift ($310 vs $180) but less per hour ($29.50 vs $34.00, 2 doubles / all-day and 8 singles). The extra hours were the weaker hours.

**Doubles / all-day, not enough**

> Only 1 double / all-day this month, so Insights won’t say whether doubles are worth it yet. It waits for 2 doubles and 3 singles.

**Trend, month**

> Your real hourly this month is $33.10, down $2.40 from last month (12 shifts vs 14).

**Trend, flat**

> Your real hourly this month ($33.40) is about the same as last month ($32.90).

**Trend, all time**

> Over the last 28 days your real hourly is $35.00, up $3.20 from the 28 days before (9 shifts vs 11).

**Role**

> Server shifts paid $34.00 an hour this month (10 shifts). Bartender shifts paid $28.50 (4 shifts).

**All time, best day**

> Since Mar 2, 2026, Friday has paid best: $36.80 an hour across 22 shifts, ahead of Sunday at $30.10 (18 shifts).

### 8.4 What Insights will not do in v1

- It will not read notes or tip-out names to invent a reason (“you earn more when it rains”).
- It will not rank a weekday from a single week.
- It will not predict next week.
- It will not give tax, scheduling, or “drop that shift” advice beyond the double sentence defined above.
- It will not send the shifts anywhere.

Changing the lunch cutoff or the double threshold changes the sentences the next time he opens Summary. The screen uses the current settings and says so when it talks about lunch (“Lunch is a start before 4:00pm”).

### 8.5 Cloud prose, if he ever asks for it

Not planned. Documented so the option is a choice rather than a quiet dependency.

A cloud language model could rewrite the same conclusions in a looser voice. To do that, the phone would have to send earnings off the device. Even a “summaries only” payload — weekday, meal, rates, and counts — is still his income, it would sit on a vendor’s servers, and it would be tied to the request. Notes, names, and the profile name would make that worse.

If this were ever built: default off, a separate consent screen that says the numbers will leave the phone, send aggregates only, never send notes or names, and keep the on-device sentence as the source of truth underneath the rewrite. v1 does not include the toggle.

---

## 9. Privacy and store readiness

- No account, no email, no phone number, no sign-in.
- No server. No network calls in v1. Insights included.
- Shifts, wages, sales, notes, and names stay in the app’s private SQLite file.
- The app does not read contacts, photos, location, or the clipboard on a timer.
- No analytics and no third-party crash SDK in v1. The store privacy label should say data is not collected.
- Anyone who can open the phone can open the app and switch profiles in v1. A per-profile lock is v1.1 and is specified in section 10. Until then, the phone’s passcode is the lock.
- Delete one shift, all shifts on a profile, one profile, or all data. Each confirm names what will be lost. Delete-all is a two-step screen. There is no trash and no undo.
- Uninstalling removes the private file. v1 does not promise a surviving copy.
- The phone’s own encrypted backup (iCloud or Android backup) may include the database, because that is the operating system default and it is the only way a lost phone does not destroy the ledger. v1 does not add its own cloud copy. About text: “Your shifts stay on this phone. If you back up your phone, your shifts may be in that backup. Tip Tracker does not upload them.”
- About text also says the app is a personal record, not tax, payroll, or legal advice. The app does not report tips to an employer or the IRS and does not decide what is owed.
- No custom cryptography in v1. Store export paperwork can say the app uses ordinary OS storage and no non-exempt encryption of its own.
- No ads, no payments, no accounts.
- Accessibility: 44pt targets, labels on icon-only controls, system text size as far as the layout allows, contrast held in light and dark.

---

## 10. Later versions, specified enough to not paint v1 into a corner

These are not built now. The data model above does not need extra tables for them, except where noted.

### Tax-time export (v1.1)

CSV and PDF, for the active profile and a date range he picks (a calendar year is the obvious one).

CSV columns: date, role, hours, hourly wage, wage earnings, guest tips, cash tips, card tips, tip share, sales, tip-out, net tips, take-home, note. One row per shift. Amounts in dollars with two decimals.

PDF: profile name, the range, the same dashboard totals as Summary, then the rows, then the sentence “This is a personal record of entries, not a tax document.”

Sharing uses the system share sheet. Generating a file he then shares is the first time data leaves the app, and only because he sent it.

### Charts (v1.1)

Take-home and real hourly by week, over the range he is looking at. Same snapshots as the list. No new inputs.

### Free-form tags (v1.1)

A `shift_tag` table (shift id, label) and a small chip editor behind the note. Insights in v1.1 may grow a “best tag” comparison using the same 3-shift minimum. v1 meal and double overrides stay their own columns so they are not mixed up with “patio.”

### File backup and restore (v1.1)

One file he exports and stores wherever he wants (Files, a mail draft to himself, a computer). It contains every profile, role, shift, and note. It is sensitive.

- The export can be protected with a passphrase he chooses. The file is then encrypted. The passphrase is not stored in the app. If he loses it, the file cannot be restored.
- Without a passphrase, the file is plain and the export screen says that.
- Restore is a full replace of the app’s data, behind the same two-step confirmation as delete-all, because a merge that double-counts a Friday is worse than a restore he can see. “Add these shifts in” is not part of v1.1.
- This is not an account. Nothing is uploaded unless he uploads the file himself.

### PIN or biometrics, per profile (v1.1)

Optional. Off by default.

- Turning it on for a profile requires a PIN. Face ID or fingerprint is offered when the device has it. The PIN still works when biometrics fail.
- The secret lives in the OS keychain, not in SQLite.
- The app locks that profile when it backgrounds. The other profiles stay as they were.
- Honest limit: this is a gate on the screen. It does not encrypt the SQLite file. Someone with a copy of the file has the shifts. Encrypting the database with a keychain key is a possible later step, and it is not part of the v1.1 lock.

### iCloud or Google Drive (v2)

A copy of his wages and tips would live on that account. The provider’s terms apply. The account can be breached, shared, or compelled. If this is built, the file should be encrypted with a passphrase before it is uploaded, so the drive holds ciphertext. Metadata (that a backup exists, and when) would still leave the phone. The default stays the v1.1 file he controls. v1 and v1.1 do not link a Google or Apple account inside Tip Tracker.

### AI theme generator (later, after a backend)

Not v1, not v1.1, and not part of the v2 drive backup above. This waits until Tip Tracker has a small backend of its own for cloud backup. Until that server exists, Settings has no prompt box and the app does not call a model.

When it is built, Settings has a box where he describes a vibe, for example “sunset over the ocean.” The app sends that sentence to the backend. The backend returns a palette and one style the app already draws: polka dot, gradient, or two-tone. The phone paints it with the same appearance system as a theme he picked by hand.

- The model’s API key lives only on that backend proxy. It is never in the app, the web export, or the repository.
- Each person has a rate limit, so a prompt loop cannot run the bill up.
- The privacy policy and the App Store AI data disclosure are updated before this is offered. The prompt is what leaves the phone. Wages, tips, and shifts are not sent for this feature. This is not the cloud-written Insights rewrite, which stays unplanned because that one would send earnings off the phone.
- The first version returns colors and a style only. It does not generate images.

### Savings goals (v2)

A goal has a name, a target amount, and an optional date. Progress is money he marks as set aside, not an automatic slice of take-home, because take-home is not the same as “moved to savings.” That needs a small `goal` and `goal_deposit` model and a screen that is not the shift form. Left out of v1 so close-out stays fast.

---

## 11. Open questions for Michael

Answered 17 November 2026. Answers 2, 5, 6, 7, and 11 were decided explicitly. The rest use the default already written in this spec.

1. **Tips per hour.** The spec uses tips kept after tip-out. **Answer:** keep that. Tips per hour is net tips ÷ hours.
2. **The 4% guess.** **Answer:** 4% of sales stays the Server prefill. It varies by job, so every role’s tip-out stays fully editable.
3. **Percent of tips base.** **Answer:** guest tips only. Tip share is not included in the percent.
4. **Who is on the tip-out.** **Answer:** day one is one unnamed line, “4% of sales.” Names are added when he edits the role. Nothing is guessed onto Busser or Bar.
5. **Week start.** **Answer:** Wednesday. Changeable per profile.
6. **Lunch cutoff and doubles.** **Answer:** lunch is a start before 4:00pm. A double / all-day is longer than 8 hours, not 10, and not “8 or more.” The label is “Double / all-day.” Still correctable per shift.
7. **Cash tonight.** **Answer:** it is not always cash. Each role has “Tip-out paid in cash” or “Taken from paycheck,” with a per-shift override. Section 7.10 uses that choice. Tip share still counts as cash.
8. **After midnight.** **Answer:** keep 4:00am. A new shift opened before 4:00am defaults to yesterday.
9. **Breaks.** **Answer:** the app stores the hours he types and does not subtract a break. He enters the hours he wants counted.
10. **Card fees.** **Answer:** no processing-fee field in v1. He types the tip after any house cut.
11. **Shared phone.** **Answer:** PIN or Face ID stays in v1.1. v1 uses the phone’s passcode.
12. **Two jobs.** **Answer:** totals never add two profiles together.
13. **Backfill.** **Answer:** any past date is allowed. Import is not in v1.
14. **Starter roles.** **Answer:** Server, Bartender, Busser, and Host. He can add, rename, or delete the others later. The last role cannot be deleted.

---

## 12. After this spec is approved

Build the Expo app against this document. Calculation tests must include the fixtures in section 7.12 and the edge cases in section 7.13 before the form is considered done. Insights tests must cover the template choice for “not enough,” “best day,” “tie,” “doubles worth it on rate,” and “doubles weaker per hour.” No v1.1 or v2 item ships in that build unless this spec is revised.