# Ebb — Design System v2
**Theme: Warm Topographic + Apple Liquid Glass**
*Replaces the purple/lavender placeholder palette.*
*For implementation by Claude Code.*

---

## 0. Context

Ebb is a chronic illness symptom tracker. Core promise: **30-second daily log**. Audience: people with fatigue and brain fog who need calm, low-friction UI. 

Every major competitor uses cool blues/teals/purple. **Warm coral is completely unclaimed** in this category — it is our primary visual differentiator.

---

## 1. Color Tokens — Replace `src/theme.ts` entirely

```typescript
export const colors = {
  // ─── Brand ───────────────────────────────────────────────
  primary:        '#E8725A',  // Warm coral — CTAs, active states, brand moments
  primaryDark:    '#C2553F',  // Terracotta — pressed states, dark emphasis
  primaryLight:   '#FADED4',  // Peach — tag fills, chip backgrounds, light accents

  // ─── Secondary ───────────────────────────────────────────
  amber:          '#F5A962',  // Secondary charts, mild severity, warm data
  sage:           '#7EB8A4',  // "Good" / calm states, low severity, complementary

  // ─── Backgrounds ─────────────────────────────────────────
  background:     '#FDF8F5',  // Warm cream — app background (NOT pure white)
  surface:        '#FFFFFF',  // Card surfaces — float on cream background
  surfaceGlass:   'rgba(255,255,255,0.18)',  // Liquid glass card fill

  // ─── Text ────────────────────────────────────────────────
  text:           '#2D2926',  // Warm near-black — headlines, body text
  textMuted:      '#7A706B',  // Warm gray — subtitles, metadata, labels
  textInverse:    '#FFFFFF',  // White text on dark/glass surfaces

  // ─── Utility ─────────────────────────────────────────────
  border:         'rgba(232,114,90,0.15)',  // Warm-tinted border
  borderGlass:    'rgba(255,255,255,0.28)', // Glass edge highlight
  shadow:         'rgba(194,85,63,0.12)',   // Warm-tinted shadow (not cool gray)
};

/**
 * Severity scale — warm terrain metaphor (no harsh red/green binary)
 * Index 0 = severity 1 (lowest) → index 4 = severity 5 (highest)
 * Usage: severity[entry.severity - 1]
 */
export const severity: string[] = [
  '#7EB8A4',  // 1 – calm – sage green
  '#B8D4A8',  // 2 – low – sage-amber transition
  '#F5A962',  // 3 – moderate – amber
  '#E8725A',  // 4 – high – coral
  '#C2553F',  // 5 – severe – deep terracotta
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   22,
  xxl:  28,
  xxxl: 36,
};

export const radius = {
  sm:      8,
  md:      14,
  lg:      22,
  xl:      28,
  pill:    100,
};

export const fontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
};
```

---

## 2. Typography

**Primary font:** `DM Sans` (Google Fonts, add via `expo-font`)
- Weights to load: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- Install: `npx expo install @expo-google-fonts/dm-sans`

**Usage:**
- Screen titles: DM Sans 700, 28px, color `text`
- Section labels: DM Sans 600, 11px, uppercase, letter-spacing 1.2px, color `textMuted`
- Body: DM Sans 400, 15px, color `text`
- Metric numbers (severity scores, etc.): DM Sans 700, tabular figures
- Button text: DM Sans 700, 15px

**Do not use system fonts for UI text. Always use DM Sans.**

---

## 3. Liquid Glass Design Language

### What it is
Apple's Liquid Glass (iOS 26) uses frosted glass surfaces that blur and tint from content behind them, creating a sense of depth and layering.

### React Native Implementation

Install: `npx expo install expo-blur`

**GlassCard component pattern:**
```tsx
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

// Usage: wrap content in GlassCard for glass effect
// intensity: 40-60 for subtle, 70-90 for stronger blur
// tint: 'light' for white glass, 'dark' for dark glass
```

**Glass card styling:**
```typescript
const glassCard = {
  // The BlurView handles backdrop blur
  // These styles go on the container View inside BlurView
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderRadius: 22,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.32)',
  // Specular top-edge highlight (simulate with gradient or extra View)
  // Shadow: warm-tinted, not cool gray
  shadowColor: '#C2553F',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 8,
};
```

**Specular highlight** (bright inner top edge — key to glass feel):
- Add a thin `View` (height: 1) at the very top of card content
- Background: `linear-gradient` from `rgba(255,255,255,0.6)` to `rgba(255,255,255,0)`
- This simulates the light catching the top edge of glass
- Use `expo-linear-gradient`'s `LinearGradient` for this

**Background gradient** (the "terrain" beneath the glass):
- Home screen and Log screen use a warm topographic gradient background
- Use `LinearGradient` from `expo-linear-gradient`:
  ```
  colors: ['#F5A962', '#E8725A', '#C2553F']
  start: { x: 0.2, y: 0 }
  end: { x: 0.8, y: 1 }
  ```
- Other screens (History, Trends, Settings): use flat `background` (#FDF8F5) — glass works best over gradient

**When to use glass vs flat cards:**
- Glass: Home screen cards, Log screen cards (over gradient bg)
- Flat white (`surface`): History list rows, Settings rows, Trends cards (over cream bg)
- The gradient background should bleed behind the nav bar (use `expo-blur` on nav bar too)

---

## 4. Components

### Bottom Navigation Bar
- Glass pill style: `BlurView` intensity 80, tint 'light'
- Rounded pill shape: borderRadius 100 (full pill)
- Float above content with margin from bottom safe area
- No labels except for active tab
- Active icon: filled, `primary` color
- Inactive icon: outline, `textMuted` color
- Active indicator: small dot below icon, `primary` color
- **DO NOT use emoji icons.** Use custom SVG icons via `react-native-svg`

### Symptom Icon Library (custom SVG, no emojis)
Each symptom type gets a custom SVG icon. These appear in small rounded square containers (28×28, bg `rgba(255,255,255,0.12)`, border-radius 8).

Core icons to implement (16×16 SVG viewport, stroke-based, stroke-width 1.4):
- **Pain / waveform:** irregular waveform line (peaks and valleys)
- **Fatigue / battery:** battery with partial fill
- **Brain Fog / cloud:** simple cloud with rain dots below
- **Nausea / waves:** three horizontal wavy lines
- **Headache / lightning:** small lightning bolt
- **Anxiety / spiral:** small spiral/vortex
- **Dizziness / swirl:** circular arrows
- **Joint Pain / joint:** two connected circles (joint symbol)
- **Sleep Quality / moon crescent:** stylized crescent (NOT emoji moon — geometric crescent arc)
- **Mood / signal:** ascending signal bars
- **Custom:** adjustable-sliders icon

### Severity Selector (Daily Log)
- 5 dots per symptom row, 44×44 touch targets
- Unselected: circle, border `rgba(255,255,255,0.3)`, no fill
- Selected: filled circle in severity color, slight scale-up animation (1.2x)
- "Mild" / "Severe" micro-labels at far ends
- DO NOT use sliders — dots are faster for fatigued users

### Primary Button
- Liquid glass style: `BlurView` intensity 60
- Background: `rgba(255,255,255,0.25)` tint + white border
- Over gradient bg: appears as frosted glass pill
- On flat bg: use solid `primary` fill instead (more contrast)
- Height: 56px, borderRadius: 18, full-width
- Text: DM Sans 700, 15px, white

### Symptom Chip (Onboarding)
- Unselected: bg `surface`, border `border`, text `textMuted`
- Selected: bg `primaryLight` (#FADED4), border `primary`, text `primaryDark`
- borderRadius: pill (100), padding: 8px 16px
- Text: DM Sans 600, 13px

---

## 5. Screen Specifications

### Screen 1 — Onboarding

**Background:** flat `background` (#FDF8F5) — keep calm, no gradient for first-launch

**Step 1: Symptom Selection**
- Header: "What do you want to track?" — DM Sans 700, 28px, `text`
- Subtext: "Pick up to 5. You can change these later." — DM Sans 400, 15px, `textMuted`
- Counter pill: "2 / 5 selected" — small rounded pill, bg `primaryLight`, text `primaryDark`, DM Sans 600 12px
- Chip grid: 2-column grid of symptom chips (see Chip component above)
  - Chips: Pain, Fatigue, Brain Fog, Nausea, Headache, Anxiety, Dizziness, Joint Pain, Sleep Quality, Mood
  - Each chip shows its SVG icon (16px) + label
- Custom symptom: text input row at bottom (rounded, bg white, border `border`) + coral "Add" button
- Progress dots: 3 dots at top, first filled, others outline, `primary` color
- "Next" button: solid `primary` fill (flat bg context), full-width, bottom

**Step 2: Reminder**
- Header: "When should we remind you?" 
- Large time display: DM Sans 700, 48px, `primary` color, centered
- iOS time picker (or custom scroll picker)
- "Skip for now" text link: `textMuted`
- "Next" button: solid `primary`, full-width

**Step 3: You're all set**
- Header: "You're all set" — DM Sans 700, 28px
- Subtext: "Here's what you'll be tracking:"
- Symptom list: each item shows SVG icon + name, in white card, `radius.md`
- Reminder summary line: "Reminder set for 8:00 PM" or "No reminder set"
- "Start Tracking" button: solid `primary`, full-width

---

### Screen 2 — Home

**Background:** Warm topographic `LinearGradient`:
```
colors: ['#F5A962', '#E8725A', '#C2553F', '#7a3020']
start: { x: 0.2, y: 0 }
end: { x: 0.9, y: 1 }
```
+ SVG contour lines overlay (subtle, white, opacity 0.1)

**Status bar style:** light (white text)

**State A — Not logged today:**
- Greeting: "Good morning," (DM Sans 400, 14px, white 65%)
- Name: "Julia" (DM Sans 700, 32px, white 100%)
- Trend chart glass card:
  - Label: "THIS WEEK" (section label style)
  - Layered area chart SVG (3 symptom layers, coral/amber/sage fills)
  - Day labels: M T W T F S S, today highlighted with white dot
  - Symptom tag pills at bottom
- Symptom summary glass card:
  - Label: "TODAY'S SYMPTOMS"
  - Each symptom row: [icon box] [name] [bar track] [score]
  - Bar fill colors: severity color scale
- "Log Today's Symptoms" button: glass pill style
- Bottom nav: glass pill, floating

**State B — Already logged today:**
- Replace the CTA with "✓ Logged" — glass pill, sage green tint
- Show today's symptom ratings in the summary card as colored dots filled

---

### Screen 3 — Daily Log

**Background:** Same warm gradient as Home (same visual context)

**Header:**
- "Today's Log" — DM Sans 700, 28px, white
- Date: "Monday, Feb 23" — DM Sans 400, 14px, white 65%

**Symptom cards** (one per symptom, glass cards, scrollable):
Each card:
- Row 1: [SVG icon box] [Symptom name, DM Sans 600 16px, white]
- Row 2: 5 severity dots (44px touch targets each)
  - Unselected: white outline circle
  - Selected: filled severity color + 1.2x scale
- Row 3: "Mild" (left, white 50%, 11px) → "Severe" (right, white 50%, 11px)
- Spacing between cards: 12px

**Note card** (at bottom, glass style):
- Placeholder: "Add a note for today... (optional)"
- Multiline text input, DM Sans 400 15px, white text
- Character count: "0/500" right-aligned

**Save button:** Glass pill, full-width, sticky above keyboard
- Text: "Save Log" — DM Sans 700, 15px, white

**Skip for now:** text link below button, white 60%

---

### Screen 4 — History

**Background:** Flat `background` (#FDF8F5)

**Header:**
- "History" — DM Sans 700, 28px, `text`
- Subtitle: "47 days logged" — DM Sans 400, 14px, `textMuted`

**Calendar strip** (horizontal scroll at top):
- 7-day strip showing current week
- Each day: circle with severity color fill (or gray if not logged)
- Today: outlined in `primary`
- Selected day: slightly larger

**Log list** (scrollable, newest first):
Each row (white card, `radius.md`, `shadow`):
- Left accent bar: 4px wide, severity color (average of that day)
- Date: DM Sans 600, 15px, `text`
- Symptom dots: row of small filled circles (severity color per symptom)
- Note preview: italic, `textMuted`, 13px, single line truncated
- Right: chevron `›`, `textMuted`

**Day detail bottom sheet** (slides up on tap):
- Handle bar at top center
- Full date: DM Sans 700, 20px
- Each symptom: icon + name + 5-dot severity display (read-only, filled dots)
- Note section with full text
- "Close" button or swipe down

**Empty state:**
- Centered illustration (simple SVG of a journal/leaf)
- "No logs yet"
- "Start with today — it only takes 30 seconds" — `textMuted`
- "Log Today" button — solid `primary`

---

### Screen 5 — Trends

**Background:** Flat `background` (#FDF8F5)

**Header:**
- "Trends" — DM Sans 700, 28px, `text`
- Subtitle for free users: "Last 7 days · Unlock history with Premium" — `primary` color link

**Time range toggle:**
- Pill selector: 7D | 30D | 90D | All
- Active: bg `primary`, white text
- Inactive: bg `surface`, `textMuted`
- Full-width, borderRadius pill

**Symptom trend cards** (white cards, `radius.md`):
Each card:
- Header row: [icon box] [Symptom name] | [avg badge: "avg 4.2"]
  - Avg badge: bg `primaryLight`, text `primaryDark`, pill shape
- **Area chart** (NOT bar chart — layered terrain style):
  - Smooth curved line with fill beneath (gradient from severity color to transparent)
  - X axis: day labels (M T W T F S S)
  - Y axis: 1–5 implicit (no axis labels — just proportional height)
  - Today dot: white circle on the line
  - Missing data: gap in line (no placeholder bars)
- Color legend: mini dots "1 ● 2 ● 3 ● 4 ● 5" in severity colors, right-aligned

**Premium gate card** (when free user selects 30D+):
- Glass-style lock card
- "Unlock full history" — DM Sans 700
- "See all your trends over time" — `textMuted`
- "Try Premium Free for 14 days" button — solid `primary`

---

### Screen 6 — Settings

**Background:** Flat `background` (#FDF8F5)

**Header:** "Settings" — DM Sans 700, 28px

**Section cards** (white, `radius.md`, `shadow`):

**My Symptoms:**
- Section label: "MY SYMPTOMS"
- Each symptom row: [SVG icon, 20px] [name, DM Sans 500] [⠿ drag handle right] [× delete right]
- Drag to reorder (react-native-draggable-flatlist)
- Add row at bottom: text input + "Add" button (`primary`)
- Hint: "3 of 5 symptoms (free plan)" — `textMuted`, 12px

**Daily Reminder:**
- Section label: "REMINDER"
- Row: bell icon + "8:00 PM" + "Change" button (text link, `primary`)
- Or: "No reminder" + "Set one" button

**Account:**
- Section label: "ACCOUNT"
- Signed out: "Sign in to back up your data" — row with arrow
- Signed in: email address + "Sign Out" button (text link, danger)
- Premium badge if subscribed: "Premium ✓" in `primary` color pill

**Export:**
- Section label: "EXPORT"
- "Export CSV" row — arrow, always available
- "Export PDF Report" row — lock icon if free, arrow if premium

**About:**
- "Ebb" — DM Sans 700 + version "1.0.0"
- "Track in 30 seconds a day" — `textMuted`
- Privacy Policy · Terms of Use links

---

## 6. Iconography Rules

**NEVER use emoji in UI.** All icons are custom SVG via `react-native-svg`.

**Nav icons** (20×20, stroke-width 1.5):
- Home: house outline / filled
- History: calendar outline / filled
- Trends: line chart (ascending waveform)
- Settings: adjustable sliders

**Symptom icons** (14×14, stroke-width 1.4, inside 28×28 icon box):
See Section 4 above. Render as SVG components.

**UI icons** (20×20 standard, stroke-width 1.5):
- Chevron right: `›`
- Close/X
- Lock (for premium gates)
- Bell (reminder)
- Check (saved/logged)
- Plus (add)
- Drag handle (three horizontal lines)
- Share (export)

---

## 7. Animation Guidelines

- Severity dot selection: `Animated.spring` scale 1.0→1.2 on select
- Card entrance: `Animated.timing` opacity 0→1, translateY 10→0, 200ms, staggered
- Bottom sheet: `react-native-reanimated` slide up, spring physics
- Log save: brief success state (checkmark pulse), then navigate home
- Tab transitions: no cross-fade (instant) — keep it snappy for fatigued users

---

## 8. Accessibility

- All touch targets minimum 44×44px
- Contrast ratios:
  - White text on `primary` (#E8725A): ✅ meets AA at large sizes
  - `text` (#2D2926) on `background` (#FDF8F5): ✅ exceeds AAA
  - `textMuted` (#7A706B) on `surface` (#FFF): ✅ meets AA
- Reduce Motion: respect `AccessibilityInfo.isReduceMotionEnabled()` — disable spring animations
- Screen reader: all SVG icons need `accessible={true}` and `accessibilityLabel`

---

## 9. File Deliverables for Claude Code

| File | Action |
|------|--------|
| `src/theme.ts` | **Replace entirely** with v2 tokens above |
| `src/components/GlassCard.tsx` | **Create** — BlurView wrapper with glass styling |
| `src/components/SeverityDots.tsx` | **Create** — 5-dot severity selector |
| `src/components/SymptomIcon.tsx` | **Create** — SVG icon switcher by symptom name |
| `src/components/BottomNav.tsx` | **Update** — glass pill style |
| `src/components/GradientBackground.tsx` | **Create** — warm topographic gradient + contour lines |
| `src/screens/HomeScreen.tsx` | **Update** — new design system |
| `src/screens/DailyLogScreen.tsx` | **Update** — new design system |
| `src/screens/HistoryScreen.tsx` | **Update** — new design system |
| `src/screens/TrendsScreen.tsx` | **Update** — new design system |
| `src/screens/SettingsScreen.tsx` | **Update** — new design system |
| `src/screens/OnboardingScreen.tsx` | **Update** — new design system |

**New dependencies to install:**
```bash
npx expo install expo-blur expo-linear-gradient react-native-svg
npx expo install @expo-google-fonts/dm-sans expo-font
npx expo install react-native-reanimated react-native-gesture-handler
```

---

## 10. Reference Assets

### Mockups (design/mockups/)
- `openclaw-canvas-snapshot-f15bb1bc-3a52-4c68-9cc3-bb7669fda256.png` — Home Screen / Add Symptoms entry screen (HomeScreen.tsx) v1, revised per Julia feedback
- `openclaw-canvas-snapshot-35d081de-ef3c-42cb-ba46-0d177f8262e0.png` — Home Screen / Add Symptoms entry screen (HomeScreen.tsx) v2, revised per Julia feedback
- `openclaw-canvas-snapshot-c0b8e6de-34ba-479a-8d25-caf2f6cc1549.png` — Home Screen / Add Symptoms entry screen (HomeScreen.tsx) v3

### Other Assets
- Color palette visual: `design/specs/color-system.md`
- App icon (chosen): `design/assets/icon-topographic.png` (Topographic Signal direction)
- UI liquid glass HTML prototype: `~/.openclaw/canvas/ui-liquid-glass.html`

---

*Design system v2. Approved by Julia. Implement with Claude Code in new session.*
