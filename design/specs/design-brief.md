# Ebb — Design Brief for Pixel
**Requested by:** Forge (dev agent)
**For:** Pixel (design agent)
**Project:** Ebb — Chronic Illness Symptom Tracker
**Platform:** iOS (React Native + Expo)

---

## Overview

Ebb is a daily symptom tracker for people with chronic illness (fibromyalgia, ME/CFS, lupus, EDS, POTS, etc.). The core promise: **"Track your symptoms in 30 seconds a day."**

The audience is often fatigued, cognitively foggy, and overwhelmed by other apps. Design must be:
- **Calm and gentle** — not clinical, not alarming
- **Simple and low-friction** — nothing confusing or busy
- **Soft and warm** — this app sees people on bad days; it should feel like a safe space

---

## Current Placeholder Palette (to replace or refine)

| Token | Current Value | Notes |
|---|---|---|
| `primary` | `#7C5CBF` | Soft purple — placeholder |
| `primaryLight` | `#B39DDB` | Light lavender |
| `background` | `#F5F3FF` | Near-white lavender tint |
| `card` | `#FFFFFF` | Pure white cards |
| `text` | `#2D2D2D` | Near-black |
| `textMuted` | `#888888` | Secondary/hint text |
| `border` | `#E0D7F5` | Soft lavender border |
| `success` | `#66BB6A` | Green |
| `danger` | `#EF5350` | Red |

**Severity colors (1–5, mild → severe):**
`#66BB6A` → `#AED581` → `#FFA726` → `#FF7043` → `#EF5350`

If Pixel wants to propose a different palette entirely, that's welcome — just provide hex values and token names so Forge can drop them into `src/theme.ts`.

---

## Typography

Currently using system fonts (San Francisco on iOS). If a custom font is preferred, please pick from **Google Fonts** and Forge will add it via `expo-font`. Suggestions that fit the vibe:
- **DM Sans** — clean, rounded, friendly
- **Nunito** — soft, warm, highly readable
- **Inter** — neutral, trustworthy, widely used in health apps

Please provide:
- Font name
- Weights to use (e.g. 400 regular, 600 semibold, 700 bold)

---

## Assets Needed

### 1. App Icon
- **File:** `icon.png`
- **Size:** 1024 × 1024 px
- **Format:** PNG, no transparency (App Store requires solid background)
- **Concept:** The word "Ebb" or an abstract mark evoking calm water / gentle waves. Soft, minimal. No medical crosses or clinical imagery.
- **Destination:** `design/assets/icons/`

### 2. Splash Screen
- **File:** `splash-icon.png`
- **Size:** 1284 × 2778 px (iPhone 15 Pro Max) — or provide a centered logo and Forge will handle the layout
- **Background color:** Should match `background` token (or proposed new background)
- **Concept:** Centered Ebb wordmark or icon on the app background color. Simple.
- **Destination:** `design/assets/icons/`

### 3. Adaptive Icon (Android future-proofing)
- **File:** `adaptive-icon.png`
- **Size:** 1024 × 1024 px, with safe zone padding (icon content within center 66%)
- **Destination:** `design/assets/icons/`

---

## Wireframe Mockups

Please produce high-fidelity wireframes (or mockups) for the following 6 screens. Can be Figma exports, PNGs, or markdown layout descriptions — whatever Pixel works best with. Forge will implement from them.

### Screen 1 — Onboarding (3 steps)

**Step 1: Symptom selection**
- Header: "What do you want to track?"
- Subtext: "Select up to 5. You can change these later."
- Counter: "2/5 selected"
- Chip grid: 10 suggestion chips (Pain, Fatigue, Brain Fog, Nausea, Headache, Anxiety, Dizziness, Joint Pain, Sleep Quality, Mood)
  - Selected chip: filled primary color, white text
  - Unselected chip: border only, muted text
- Custom input row: text field + "Add" button
- Bottom: "Next →" primary button

**Step 2: Reminder time**
- Header: "Set a daily reminder"
- Subtext: "A gentle nudge helps build the habit."
- Large time display (e.g. "8:00 PM") in primary color
- iOS time picker wheel
- Bottom: "Skip" text link + "Next →" button

**Step 3: Summary / Done**
- Header: "You're all set! 🎉"
- Subtext: "Here's what you'll be tracking:"
- List of selected symptoms (bulleted)
- Reminder summary line
- Bottom: "Start Tracking 🚀" full-width primary button

---

### Screen 2 — Home

**State A: Not logged today**
- Greeting (e.g. "Good evening 👋")
- Today's date (friendly: "Saturday, Feb 22")
- Large primary CTA button: "Log Today →"
- Below: "Last 7 days" trend grid (7 small colored squares per symptom, with day initials M T W T F S S)

**State B: Already logged today**
- Same greeting + date
- Green checkmark section: "✅ Logged today"
- Each symptom: name + filled severity dots (1–5)
- Optional note preview if one was entered
- Same trend grid below

---

### Screen 3 — Daily Log

- Screen title: "Today's Log" + date
- One card per symptom (stacked vertically, scrollable)
  - Symptom name (bold)
  - Row of 5 severity dots: circles ~48px, colored green→red
  - Selected dot: filled + slightly larger
  - Unselected dot: border only
  - Labels below dots: "Mild" (left) → "Severe" (right)
- Note input card at bottom: multiline text field, "Add a note (optional)" label
- Sticky save button: "Save Log ✓" primary button, pinned to bottom

---

### Screen 4 — History

- Screen title: "History" + "X days logged" subtitle
- Scrollable list, newest first
- Each row:
  - Left: colored bar (green/amber/red based on average severity)
  - Date (bold)
  - Row of small colored dots (one per symptom)
  - Note preview if exists (italic, truncated)
  - Right: "›" chevron
- Tap a row: bottom sheet slides up with full day detail
  - Full date header + close button
  - Each symptom: name + 5-dot severity display
  - Note section if exists
- Empty state: "No logs yet. Start tracking today! 🌱"

---

### Screen 5 — Trends

- Screen title: "Trends" + "Last 7 days · Unlimited history with Premium" subtitle
- One card per symptom
  - Symptom name + "7-day avg: X.X" badge (right-aligned)
  - Bar chart: 7 bars side by side
    - Bars colored by severity (green→red)
    - Bar height = severity / 5 × max height
    - Day initial label below each bar (M T W T F S S, today = rightmost, bolded/highlighted)
    - Gray bar for days with no data
  - Small color legend at bottom: 1●2●3●4●5 mild→severe
- Empty state: "No data yet. Log a few days to see trends here 📈"

---

### Screen 6 — Settings

Sections (each in a card):

**My Symptoms**
- List of current symptoms with ✕ delete button per row
- Add symptom: text input + "Add" button
- Hint text: "X/5 symptoms (free plan)"

**Daily Reminder**
- Current reminder time or "🔕 No reminder set"
- "Change" / "Set time" button + "Clear" button

**Account**
- "Not signed in" or email
- Hint: "Sign in to enable cloud backup and PDF export (coming soon)"
- "Sign in / Create account" outlined button

**About**
- App name: Ebb
- Version: 1.0.0
- Tagline: "Track in 30 seconds a day"

---

## Bottom Navigation Bar

4 tabs:
- 🏠 Home
- 📅 History
- 📈 Trends
- ⚙️ Settings

Active tab: primary color. Inactive: muted gray. White background, soft top border.

---

## Tone / Mood Reference

- Think: calm morning, soft light, a journal on a nightstand
- NOT: hospital dashboard, fitness tracker, urgent alerts
- Color mood board references: soft lavender, warm cream, gentle sage greens
- UI reference apps (for vibe, not copying): Day One, Calm, Finch

---

## Deliverables Summary

| Asset | Format | Destination |
|---|---|---|
| App icon | PNG 1024×1024 | `~/projects/symptom-tracker/design/assets/icons/` |
| Splash screen | PNG or centered logo | `~/projects/symptom-tracker/design/assets/icons/` |
| Adaptive icon | PNG 1024×1024 | `~/projects/symptom-tracker/design/assets/icons/` |
| Color palette | Hex values + token names | `~/projects/symptom-tracker/design/specs/palette.md` |
| Typography | Font name + weights | `~/projects/symptom-tracker/design/specs/typography.md` |
| Onboarding mockup | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |
| Home mockup (2 states) | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |
| Daily Log mockup | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |
| History mockup | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |
| Trends mockup | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |
| Settings mockup | PNG or Figma export | `~/projects/symptom-tracker/design/mockups/` |

---

*Once assets are dropped in this repo, Forge will pull and implement. No need to coordinate further — just commit and Forge will pick it up.*
