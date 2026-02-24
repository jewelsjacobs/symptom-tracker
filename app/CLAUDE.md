# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ebb** — Chronic illness symptom tracker. React Native (Expo) app targeting iOS-first. Users log symptom severity (1-5 scale) daily in under 30 seconds. Freemium model with a 5-symptom free tier.

## Agent Board Integration

You share this project with Builder (a design/planning agent). Coordinate via Agent Board API:

```bash
# List your tasks
curl -s http://localhost:3456/api/tasks | python3 -c "
import json,sys
for t in json.load(sys.stdin):
  if t['projectId']=='proj_c991be755405a07e':
    print(f\"[{t['status']}] {t['title']} ({t['id']})\")"

# Pick up a task (move to doing)
curl -s -X PATCH http://localhost:3456/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"doing"}'

# Complete a task
curl -s -X PATCH http://localhost:3456/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Create a new task
curl -s -X POST http://localhost:3456/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"...","projectId":"proj_c991be755405a07e","assignee":"claude-code","priority":"medium","tags":["phase-1","dev"],"status":"backlog"}'

# Add a comment to a task (to communicate with Builder)
curl -s -X POST http://localhost:3456/api/tasks/TASK_ID/comments \
  -H "Content-Type: application/json" \
  -d '{"author":"claude-code","text":"Done — implemented in src/screens/OnboardingScreen.tsx"}'
```

### Workflow
1. Check Agent Board for tasks tagged with dev/backend/setup in the Ebb project (proj_c991be755405a07e)
2. Pick up tasks in phase order (phase-0 → phase-1 → etc.)
3. Move tasks to "doing" when starting, "done" when finishing
4. If you need a design asset from Builder, create a task assigned to "builder" with tag "design" and a clear description of what you need
5. Check design/ directory for wireframes and specs Builder has created before implementing screens
6. After completing work, add a comment to the task noting what files were changed
7. Skip tasks tagged "design" only — those belong to Builder
8. Work autonomously through coding tasks without waiting for permission

## Pre-Commit Workflow (REQUIRED before every git commit)

Before committing any code changes, always follow this sequence:

1. **Run Expo Doctor:**
   ```bash
   cd /Users/openclaw/projects/symptom-tracker/app && npx expo-doctor
   ```

2. **Evaluate each issue using this judgment guide:**
   - ✅ **Auto-fix:** Outdated package versions, missing/incorrect config fields, SDK version mismatches, wrong package.json fields
   - ✅ **Auto-fix:** Warnings about `app.json` schema, missing `bundleIdentifier`, icon/splash config issues
   - ⚠️ **Ask before fixing:** Major SDK version upgrades (e.g. Expo 54 → 55), native module breaking changes
   - ⚠️ **Ask before fixing:** Anything that could remove or replace a dependency

3. **Apply safe fixes**, then re-run `npx expo-doctor` to confirm clean output.

4. **Only commit once expo-doctor passes** (or remaining issues are explicitly flagged/accepted).

5. **After committing a completed feature**, push an OTA update so it can be tested on device immediately:
   ```bash
   cd /Users/openclaw/projects/symptom-tracker/app && eas update --branch preview --message "brief description of what changed"
   ```
   This delivers the update to the Preview build on the iPhone without requiring a full rebuild.

> Note: A full `eas build --profile preview --platform ios` is only needed when native code changes — new native packages, plugin changes, or `app.json` native config changes. For JS/TS/asset-only changes, always use `eas update` instead.

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

**Entry flow:** `index.ts` → `App.tsx` → `RootNavigator` (loads settings from AsyncStorage, routes to Onboarding or Main).

**Navigation structure** (`src/navigation/index.tsx`):
- `RootStack` — conditional: Onboarding or Main
- `MainTab` — bottom tabs: HomeStack | History | Trends | Settings
- `HomeStack` — nested stack: Home → DailyLog

Onboarding completion is signaled via `AppContext` (React Context). The `useAppContext().completeOnboarding()` call swaps the root route.

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
- Exports `colors`, `severity` (color array indexed by severity-1), `spacing`, `fontSize`, `radius`, `fontWeight`
- Warm coral palette (`primary: #E8725A`, `background: #FDF8F5`) — "Warm Topographic + Liquid Glass" theme
- Font: DM Sans (loaded in App.tsx via `@expo-google-fonts/dm-sans`)
- Component library in `src/components/`: GlassCard, GradientBackground, SeverityDots, SymptomIcon, BottomNav
- Full spec: `design/specs/design-system-v2.md`

## Conventions

- TypeScript strict mode. Types live in `src/types/`.
- Functional components with hooks only — no class components.
- Screens are self-contained in `src/screens/` with co-located styles.
- `src/components/` exists but is empty — extract shared components there when needed.
- Dates are always `YYYY-MM-DD` strings. Times are `HH:MM` strings.
- Free tier limit: `MAX_FREE_SYMPTOMS = 5`.

## Key Dependencies

- Expo ~54, React Native 0.81, React 19
- `@react-navigation` (stack + bottom-tabs) for routing
- `@react-native-async-storage/async-storage` for persistence
- `@react-native-community/datetimepicker` for reminder time picker
- `expo-notifications` for daily reminders

## Design Assets

Builder saves wireframes and design specs to:
- `~/projects/symptom-tracker/design/wireframes/` — HTML/CSS wireframes per screen
- `~/projects/symptom-tracker/design/specs/` — design brief, palette, typography
- `~/projects/symptom-tracker/design/mockups/` — higher fidelity mockups
- `~/projects/symptom-tracker/design/assets/` — icons, images

Always check these directories before implementing a screen to match the intended design.
