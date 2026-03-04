# Ebb — Final Design Revision Guide
# Give this entire file to Claude Code as your prompt.

---

## CONTEXT

Ebb is a chronic illness symptom tracker. Users log symptoms when they feel terrible — fatigued, foggy, in pain. Every design decision must prioritize:

1. **Readability** — readable with blurry vision, in a dark room, half-asleep
2. **Speed** — log in under 30 seconds without thinking
3. **Accessibility** — works for colorblind users, low vision, motor impairment
4. **Distinctness** — warm coral palette, NOT like Bearable (teal), Daylio (colorful), or generic health apps

---

## GLOBAL CHANGES (apply to EVERY screen)

### G1. Switch from DM Sans to iOS System Fonts

Remove DM Sans entirely. Use iOS SF Pro system fonts which support Dynamic Type automatically.

```typescript
// DELETE: @expo-google-fonts/dm-sans dependency
// USE instead:
fontFamily: 'System'          // SF Pro (default sans-serif)
fontFamily: 'ui-rounded'      // SF Pro Rounded (friendly variant)
fontFamily: 'ui-serif'        // New York (serif, if needed)
fontFamily: 'ui-monospace'    // SF Mono (numbers, code)
```

**Font size hierarchy (iOS 26 standard):**
- Large Title: 34pt, Bold
- Headline / Buttons: 17pt, Semi-Bold (600)
- Body: 17pt, Regular (400)
- Subheadline: 15pt, Regular
- Footnote / Secondary: 13pt, Regular
- Minimum interactive text: 11pt, Medium (500)

**CRITICAL: All font sizes must be multiplied by `fontScale`** from `useWindowDimensions()` to support Dynamic Type. Create a reusable text component:

```typescript
import { Text, useWindowDimensions, StyleSheet } from 'react-native';

const EbbText = ({ style, type = 'body', children, ...props }) => {
  const { fontScale } = useWindowDimensions();

  const styles = {
    largeTitle: { fontSize: 34 * fontScale, fontFamily: 'System', fontWeight: '700' },
    headline:   { fontSize: 17 * fontScale, fontFamily: 'System', fontWeight: '600' },
    body:       { fontSize: 17 * fontScale, fontFamily: 'System', fontWeight: '400' },
    subhead:    { fontSize: 15 * fontScale, fontFamily: 'System', fontWeight: '400' },
    footnote:   { fontSize: 13 * fontScale, fontFamily: 'System', fontWeight: '400' },
    caption:    { fontSize: 11 * fontScale, fontFamily: 'System', fontWeight: '500' },
    button:     { fontSize: 17 * fontScale, fontFamily: 'System', fontWeight: '600' },
  };

  return <Text style={[styles[type], style]} {...props}>{children}</Text>;
};
```

**Use `EbbText` for ALL text in the app.** Do not use raw `<Text>` with hardcoded font sizes.

**Letter spacing:**
- 17pt body text: tracking -0.43
- 34pt titles: tracking +0.40

**Weight rules:**
- Never use thin/light weights (300 or below) — they wash out on translucent backgrounds
- Body text minimum: Regular (400)
- Labels on colored backgrounds: Medium (500) or Semi-Bold (600)

### G2. Respond to iOS Accessibility Settings

The app must automatically respond to these iOS system settings:

**Dynamic Type:** Already handled by the `fontScale` multiplier above. Layouts must accommodate larger text without clipping or overlapping — use flexbox, not fixed heights.

**Increase Contrast:** Detect with `AccessibilityInfo` and swap to higher-contrast colors:
- Bolder borders (1px → 2px, darker color)
- Darker text colors
- Less transparency on cards

**Reduce Transparency:** Detect and replace any BlurView/glass effects with solid opaque backgrounds.

**Reduce Motion:** Detect with `AccessibilityInfo.isReduceMotionEnabled()` and disable all spring/scale animations.

### G3. Symptom Icons Must Be Unique Colors

Each symptom gets a permanently assigned, visually distinct color. These colors must have enough hue separation that they are distinguishable at a glance AND for colorblind users.

**Updated symptom color assignments (higher saturation, wider hue range):**

```typescript
export const symptomColors: Record<string, string> = {
  'pain':          '#D4483B',  // strong red — waveform icon
  'fatigue':       '#E8725A',  // coral — battery icon
  'brain fog':     '#2A9D8F',  // teal — cloud icon
  'nausea':        '#E9A830',  // golden amber — wavy lines icon
  'headache':      '#7B4EA3',  // purple — lightning bolt icon
  'anxiety':       '#4A7FBB',  // blue — spiral icon
  'dizziness':     '#D4883B',  // orange — circular arrows icon
  'joint pain':    '#C44569',  // rose — joint symbol icon
  'sleep quality': '#6C63FF',  // indigo — proper crescent moon icon
  'mood':          '#2EAD6B',  // green — signal bars icon
  'depression':    '#7B4EA3',  // purple — bar chart icon
};
```

**How to apply symptom colors everywhere:**
- Icon stroke color: full symptom color
- Icon container background: symptom color at 15% opacity
- Chart bars: full symptom color
- Progress bars in TODAY'S SYMPTOMS: full symptom color as fill
- Left accent bars (History, You're All Set): full symptom color, 4-5px wide
- Trend chart lines/areas: full symptom color

**Icon sizing:**
- Onboarding chips: 18px icon in 28px container
- Home screen / Today's Log / Settings rows: 22px icon in 34px container
- Trend cards: 24px icon in 36px container

### G4. Fix the Sleep Quality Moon Icon

The current moon icon looks like a cookie with a bite taken out. Replace with a proper geometric crescent arc — two overlapping circles where the smaller circle masks part of the larger one, creating a clean crescent shape.

### G5. Severity Scale Needs More Hue Separation

The current warm-only severity scale (sage → amber → coral → terracotta) has values that are too close in hue. Replace with a wider spectrum:

```typescript
export const severity: string[] = [
  '#2A9D8F',  // 1 – mild – teal green
  '#6BBF59',  // 2 – low – green
  '#E9A830',  // 3 – moderate – amber/gold
  '#E8725A',  // 4 – high – coral
  '#D4483B',  // 5 – severe – strong red
];
```

This scale goes teal → green → gold → coral → red, which is distinguishable even for most colorblind users and reads intuitively (cool = mild, hot = severe).

### G6. Bottom Navigation — Use Expo Native Tabs

Replace the custom bottom nav bar with Expo Router Native Tabs:
https://docs.expo.dev/router/advanced/native-tabs/

This gives you the real iOS UITabBarController which:
- Looks and feels native automatically
- Respects Dynamic Type, Increase Contrast, and Reduce Transparency
- Has proper blur, haptics, and system-standard behavior
- Eliminates the custom nav bar code that keeps having issues
- Each tab looks individually tappable by default

If native tabs cause issues (it's alpha), fall back to a custom tab bar with:
- Solid white or high-intensity frosted glass background (intensity 90+)
- Active tab: filled icon in #E8725A + label + dot
- Inactive tabs: outlined icon in #7A706B + label
- Minimum 60px per tab zone, clear visual separation

### G7. Primary CTA Buttons

All primary action buttons (Log Today's Symptoms, Save Log, Start Tracking, Next):
- Solid coral background (#E8725A), NOT translucent/glass
- White text, fontWeight 600, 17pt
- Full width, 56px height, borderRadius 18
- Must be clearly visible against any background

### G8. "Logged" State Button

When the user has already logged today, the "Log Today's Symptoms" button changes to a "Logged" confirmation. Currently it looks like a disabled button (muted gray-coral on gradient).

**Fix:** Change to sage green (#2A9D8F) background with white text and a checkmark icon: "✓ Logged". This should feel like a satisfying confirmation, not a disabled state.

---

## PER-SCREEN CHANGES

---

### SCREEN: Onboarding Step 1 — "What do you want to track?"

- Apply symptom-specific colors to each chip's icon (not all the same color)
- Selected chip: symptom color at 15% opacity background, symptom color border, symptom color text
- Unselected chip: white background, #E5E0DD border, #2D2926 text
- Same feedback applies to the selected state shown with checkmarks

### SCREEN: Onboarding Step 3 — "You're all set"

- Left accent bars on the symptom list: use each symptom's unique color, make bars 4-5px wide (currently too thin and colors too similar)
- Symptom icons next to each name: use symptom-specific colors
- Screen is otherwise good — keep the green checkmark circles, the layout, and the Start Tracking CTA

### SCREEN: Home

**THIS WEEK panel:**
- Each symptom's chart bars must use that symptom's unique color (not all coral)
- The "today" column: replace the pink background square with just bolding the day label and coloring it coral. No background box.
- Severity number above each bar that has data (small, 11pt, #2D2926)
- Empty day bars: light gray (#E5E0DD) nubs, no number

**TODAY'S SYMPTOMS panel:**
- Remove the thin dark lines to the right of each symptom bar — they serve no purpose
- Bar track (unfilled portion): #E5E0DD (warm light gray)
- Bar fill: each symptom's unique color
- Severity number to the right of each bar: show "5", "3", etc. in bold. Show "—" only if not logged.
- The "Sleep Quality" label is wrapping to two lines — ensure the layout handles long symptom names gracefully (single line with ellipsis, or allow two lines with proper spacing)

**"Logged" button:** sage green with checkmark (see G8)

### SCREEN: Today's Log

- Symptom card icons: use symptom-specific colors
- Severity dots when selected: use the updated severity scale colors (G5) — the selected dot should clearly change hue, not just slightly shift in warmth
- Numbers inside dots are good — keep those
- Mild / Severe labels: keep
- Note field: collapse by default. Show a small "Add a note" text link that expands the field on tap. This keeps the 30-second logging promise while giving power users the option.
- Save Log button: solid coral, not translucent (see G7)
- Remove the severity color legend from each card — the numbers inside the dots are sufficient

### SCREEN: Trends

- Time range labels: change "7D · 30D · 90D · All" to "Week · Month · 3 Mo · All" — human-readable, not developer shorthand
- Symptom card icons: use symptom-specific colors, larger (24px icon, 36px container)
- Chart data points must not clip at card edges — add proper padding inside the chart area so dots/circles are never cut off by the card boundary
- Symptom name text on each card: use symptom-specific color
- When the chart has more data points, ensure the line/area renders smoothly

### SCREEN: History

- Fix "1 days logged" → "1 day logged" (pluralization)
- Symptom icons: use symptom-specific colors
- Otherwise this screen is good — keep the calendar strip, day detail bottom sheet, severity bar, and symptom dots

### SCREEN: Settings

**Reorder sections from top to bottom:**
1. My Symptoms
2. Reminder
3. Subscription (renamed from "Premium")
4. Export
5. About (moved to bottom)

**MY SYMPTOMS section:**
- Reduce row padding — use standard iOS row height (44-52px)
- Larger symptom icons (22px icon, 34px container, symptom-specific colors)

**SUBSCRIPTION section (replaces PREMIUM):**
Replace the current Premium card with a proper Subscription section containing three standard-height rows:
- Row 1: "Current Plan" — shows "Free" badge or "Premium ✓" badge
- Row 2: "Upgrade to Premium" — with chevron, tapping opens a dedicated paywall screen
- Row 3: "Restore Purchase" — standard-height tappable row (NOT tiny text), with chevron

**Dedicated Paywall Screen** (opens when tapping "Upgrade to Premium"):
- Full-screen or large bottom sheet modal
- App icon or brand illustration at top
- "Ebb Premium" headline
- Feature list with icons:
  - Unlimited symptom tracking (beyond 5)
  - Unlimited history
  - PDF export for doctor appointments
  - Trend analysis (30D, 90D, All time)
- Two pricing cards side by side: Monthly ($X.XX/month) and Annual ($XX.XX/year) with "Save X%" badge on annual
- Annual card visually highlighted as recommended
- "Start Free Trial" primary CTA button
- Small "Terms · Privacy · Restore" links at bottom

**EXPORT section:**
- Reduce vertical padding above and below — too much whitespace currently

**ABOUT section:**
- Move to very bottom of Settings
- Keep as-is (app name, version, tagline)
- Add Privacy Policy and Terms of Use links below

**REMINDER section:**
- Working correctly — no changes needed

---

## IMPLEMENTATION ORDER

1. Create the `EbbText` component and replace all `<Text>` usage throughout the app
2. Update `theme.ts` with new symptom colors, severity scale, and remove DM Sans references
3. Implement native tabs (or updated custom tab bar)
4. Fix Home Screen (bars, colors, today indicator, mystery lines, Logged button)
5. Fix Today's Log (severity colors, note field collapse, icon colors)
6. Fix Onboarding screens (chip colors, moon icon, accent bars)
7. Fix Trends (labels, chart padding, icon sizes)
8. Fix Settings (reorder sections, Subscription panel, paywall screen, padding)
9. Fix History (pluralization, icon colors)
10. Add iOS accessibility setting detection (Dynamic Type, Increase Contrast, Reduce Transparency, Reduce Motion)

## FOR EACH SCREEN:
1. Read the specific changes listed above
2. Make ALL listed changes — do not skip any
3. Take a screenshot in the simulator
4. Save as `design/mockups/[screen]-v3.png`
5. Move to the next screen

---

## WHAT "DONE" LOOKS LIKE

- [ ] Every symptom has a visually distinct icon color — you can tell them apart WITHOUT reading labels
- [ ] Text is system SF Pro, not DM Sans, and scales with Dynamic Type
- [ ] Severity levels have clear hue separation (teal → green → gold → coral → red)
- [ ] All primary buttons are solid coral with white text, clearly visible
- [ ] "Logged" button is sage green with checkmark
- [ ] Bottom nav uses native tabs or has clear tab separation
- [ ] No mystery UI elements (thin lines, unexplained dots)
- [ ] Settings sections are reordered with proper Subscription panel
- [ ] Tapping "Upgrade to Premium" opens a dedicated paywall screen
- [ ] All touch targets are minimum 44x44pt
- [ ] The app feels warm, calm, and professional — like a supportive companion for someone having a hard day
