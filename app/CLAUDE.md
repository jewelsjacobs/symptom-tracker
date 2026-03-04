# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ebb** — Chronic illness symptom tracker. React Native (Expo) app targeting iOS-first. Users log symptom severity (1-5 scale) daily in under 30 seconds. Freemium model with a 5-symptom free tier.

## Design Authority

The ONLY design specification is `design/specs/FINAL-DESIGN-REVISION.md`. Read it completely before making any visual changes. There are no other active design docs. All previous specs have been archived to `design/_archive/` and must NOT be referenced. Save new screenshots to `design/mockups/` as you complete each screen.

## Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Launch in iOS simulator
npm run android    # Launch in Android emulator
npm run web        # Launch web preview
npx tsc --noEmit   # Type-check (no linter or test runner configured yet)
```

Package manager is **npm** (not yarn/pnpm). Run `npm install` after pulling.

## Architecture

**Entry flow:** `expo-router/entry` → `src/app/_layout.tsx` (root layout — loads settings, providers, onboarding guard).

**Navigation structure** (Expo Router file-based routing in `src/app/`):
- `_layout.tsx` — Root `<Stack>`: `(tabs)` + `onboarding`, with `<Redirect>` to onboarding if needed
- `(tabs)/_layout.tsx` — `<Tabs>` with custom `BottomNav` tab bar
- `(tabs)/home/_layout.tsx` — `<Stack>` for Home → DailyLog push navigation
- `(tabs)/home/index.tsx` → HomeScreen
- `(tabs)/home/daily-log.tsx` → DailyLogScreen
- `(tabs)/history.tsx` → HistoryScreen
- `(tabs)/trends.tsx` → TrendsScreen
- `(tabs)/settings.tsx` → SettingsScreen
- `onboarding.tsx` → OnboardingScreen

Onboarding completion is signaled via `AppContext` (`src/context/AppContext.tsx`). The `useAppContext().completeOnboarding()` call triggers a `<Redirect>` to tabs.

**Data layer** (`src/storage/index.ts`):
- All data persisted locally via AsyncStorage — no backend yet
- Settings stored under key `@symptom_tracker_settings`
- Daily logs stored per-date under `@symptom_tracker_log_{YYYY-MM-DD}`
- `loadAllLogs()` scans all AsyncStorage keys by prefix

**Core types** (`src/types/index.ts`):
- `Symptom` — `{id, name, createdAt}`
- `SeverityLevel` — `1 | 2 | 3 | 4 | 5`
- `LogEntry` — `{symptomId, severity}`
- `DailyLog` — `{date (YYYY-MM-DD), entries, note?}`
- `AppSettings` — `{symptoms, reminderTime, hasCompletedOnboarding, accountEmail}`

**Design system** (`src/theme.ts`):
- Being updated per `design/specs/FINAL-DESIGN-REVISION.md`
- Warm coral palette with symptom-specific colors
- System fonts (SF Pro) with Dynamic Type support
- See FINAL-DESIGN-REVISION.md for all design tokens

## Conventions

- TypeScript strict mode. Types live in `src/types/`.
- Functional components with hooks only — no class components.
- Screens are self-contained in `src/screens/` with co-located styles.
- Shared components live in `src/components/`.
- Dates are always `YYYY-MM-DD` strings. Times are `HH:MM` strings.
- Free tier limit: `MAX_FREE_SYMPTOMS = 5`.

## Key Dependencies

- Expo ~54, React Native 0.81, React 19
- `expo-router` (file-based routing, built on `@react-navigation`) for routing
- `@react-native-async-storage/async-storage` for persistence
- `@react-native-community/datetimepicker` for reminder time picker
- `expo-notifications` for daily reminders

## Environment Variables

### How they work in this project
All secrets are stored in `.env` (gitignored — never committed). The app reads them via `process.env.EXPO_PUBLIC_*` at runtime in dev, and they are **baked in at build time** by EAS for preview/production builds.

### Current variables
| Variable | Used by |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/supabase/client.ts` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/supabase/client.ts` |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `src/purchases/index.ts` |

### Critical rules
- **Never hardcode secrets** in source files. Always use `process.env.EXPO_PUBLIC_*`.
- **Never commit `.env`** — it is gitignored. Use `.env.example` to document required variables.
- `EXPO_PUBLIC_` prefix is required for variables to be accessible in React Native code.

### When to use eas update vs eas build
| Change type | Command |
|---|---|
| JS/TS code, styles, assets | `eas update --branch preview --message "description"` |
| New native package, plugin, app.json native config | `eas build --profile preview --platform ios` |
| New or changed environment variable | `eas build --profile preview --platform ios` |

## Pre-Commit Workflow

Before committing any code changes:

1. Run `npx expo-doctor` and fix safe issues automatically
2. Ask before fixing major SDK upgrades or dependency removals
3. Re-run until clean, then commit
4. After committing a completed feature, push OTA: `eas update --branch preview --message "description"`

## Visual QA Workflow

### Tools
- **Maestro** — Navigate simulator and capture screenshots. Also used for E2E testing.
- **pixelmatch** via `scripts/compare-screens.mjs` — Generate pixel-level diff images.

### Rules
- **NEVER** rely on vision alone to compare screens. Always use the diff tool.
- **ALWAYS** use `scripts/compare-screens.mjs` to generate diff images before declaring a screen done.

### Comparison Workflow
1. Capture screenshot with Maestro
2. Compare: `node scripts/compare-screens.mjs design/mockups/[screen].png screenshots/[screen].png diffs/[screen]-diff.png`
3. Fix red areas in the diff
4. Repeat until diff percentage is below 1%

### Visual QA Directories
- `screenshots/` — Maestro-captured screenshots (gitignored)
- `diffs/` — Generated diff images (gitignored)
- `maestro/` — Capture flows and E2E tests
- `scripts/compare-screens.mjs` — The pixelmatch comparison script
