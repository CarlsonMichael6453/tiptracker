# Tip Tracker

A phone notebook for a restaurant shift. You log hours, wage, guest tips, sales, and tip-out. The app keeps the shifts on the phone and shows what the night, the week, and the month actually paid.

It is a personal record of what you type. It is not payroll, tax, or legal advice. There is no account, and the app does not upload shifts.

## Try it on an iPhone in Safari

The hosted copy is for private testing:

**https://carlsonmichael6453.github.io/tiptracker/**

Open that address in Safari, then use Share → Add to Home Screen. Shifts are stored in that browser (IndexedDB). They are not uploaded, and they are not the same book as a copy running in Expo Go or a future App Store build. Clearing Safari website data deletes them. GitHub Pages cannot turn on the special headers the native SQLite file needs in a browser, so this copy uses browser storage instead of `expo-sqlite`.

A refresh of a screen such as History stays on that screen. The site is not a public launch.

## Open it on your phone with Expo Go

This copy is the source project. It is not a store build and it does not have a standing QR code, because the shifts are meant to stay on the phone that is running it. Michael (or anyone with the repo) starts it on a computer, then opens it in Expo Go.

1. Install **Expo Go** from the App Store (iPhone) or Play Store (Android).
2. Install **Node.js 20 or newer** on the computer: [https://nodejs.org](https://nodejs.org).
3. Download this project and open a terminal in its folder.
4. Install and start:

   ```bash
   npm install
   npx expo start
   ```

5. The terminal shows a QR code.
   - **iPhone:** open the Camera app and scan the code. It offers to open Expo Go.
   - **Android:** open Expo Go and use **Scan QR code**.
6. The phone and the computer need to be on the same Wi-Fi. If they are not, stop the server and run:

   ```bash
   npx expo start --tunnel
   ```

   Tunnel needs a network connection on the computer while you are using the app. The shifts themselves are still stored only on the phone.

7. The first screen asks for a profile name (for example “Olive Garden”), the usual role, the hourly wage, and the day the week starts. Wednesday is already selected. Server tip-out starts at 4% of sales. That percent is a guess. Change it per role in Settings.

After that, **Log shift** is the close-out. On a normal server night the fields already filled in are the role, the wage, and the tip-out rule. You type hours, guest tips, and sales, then Save.

## What’s in v1

- Profiles, roles, and shifts stored in SQLite on the device.
- Tip-out as dollars, a percent of sales, or a percent of tips. A new Server role starts at 4% of sales, and every role can be edited.
- Tip share for bussers, bartenders, and hosts. Servers can open it when they need it.
- A per-role choice, overridable on a shift: tip-out paid in cash, or taken from the paycheck. That choice splits “cash tonight” from the paycheck when guest tips were entered as cash and card. It does not change take-home.
- Week starts on Wednesday unless the profile changes it.
- Lunch is a start before 4:00pm. A double / all-day is longer than 8 hours. Either one can be corrected on the shift.
- Home, history, and a summary with weekday totals and plain-language Insights.
- Light, dark, or follow the phone.

A PIN or Face ID lock is not in this version. The phone’s own passcode is the lock.

## Tests

```bash
npm test
```

The calculation tests are the worked examples in the spec (a Friday server shift, a flat tip-out, an overnight, a stiff, a busser, rounding, and a weighted week). The Insights tests lock the sentence patterns for “not enough,” “best day,” “tie,” “doubles / all-day worth it,” and “doubles / all-day weaker per hour.”

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server, for Expo Go |
| `npm test` | Calculation and Insights tests |
| `npm run typecheck` | TypeScript |
| `npm run web` | The same app in a browser, for a quick look. The phone app is the one that matters. |
