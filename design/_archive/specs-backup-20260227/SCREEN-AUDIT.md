# Ebb — Screen-by-Screen Accessibility & Usability Audit
# Give this entire file to Claude Code as your prompt.

---

## CONTEXT FOR CLAUDE CODE

You are redesigning Ebb, a chronic illness symptom tracker. Your users are people with chronic fatigue, brain fog, pain, and anxiety. They are logging symptoms when they feel terrible. Every design decision must prioritize:

1. **Readability** — Can someone with blurry vision, in a dark room, half-asleep read this?
2. **Speed** — Can they log in under 30 seconds without thinking?
3. **Accessibility** — Does it work for colorblind users? Low vision? Motor impairment?
4. **Distinctness** — Does it look different from Bearable, Daylio, and Flaredown? (They all use cool blues/teals/purples. We use warm coral. Keep that.)

**The current HIG screens all share systemic problems. Fix these globally first, then fix per-screen issues.**

---

## GLOBAL PROBLEMS (apply fixes to EVERY screen)

### G1. Coral-on-coral contrast is failing
The entire app uses coral/salmon/peach tones layered on top of each other. Text, icons, cards, and backgrounds all blend into one monochrome wash. The warm coral palette is our differentiator — keep it — but it needs a proper contrast backbone.

**Fix:** Use the warm cream (#FDF8F5) or white (#FFFFFF) as card/surface backgrounds, with #2D2926 (warm near-black) for body text and #7A706B for secondary text. Reserve the coral gradient ONLY for the background behind glass cards on the Home and Log screens. Cards themselves should be white or very light, not tinted coral.

### G2. All symptom icons are the same color
Every symptom — Pain, Fatigue, Brain Fog — uses an identical coral/salmon icon. Users cannot distinguish symptoms at a glance.

**Fix:** Assign each symptom a unique, permanent color from the design system:
- Pain → #C2553F (deep terracotta) with waveform icon
- Fatigue → #E8725A (coral) with battery icon
- Brain Fog → #7EB8A4 (sage) with cloud icon
- Nausea → #F5A962 (amber) with wavy lines icon
- Headache → #9B6B8A (muted plum — add this to palette) with lightning icon
- Anxiety → #6B8EB8 (muted blue — add this to palette) with spiral icon

These colors must also pass WCAG AA contrast against white card backgrounds (4.5:1 for small text, 3:1 for icons/large text). Check every combination.

### G3. Severity levels rely only on color
A colorblind user cannot tell severity 2 from severity 4. The bar charts on the home screen are just colored rectangles with no labels.

**Fix:** Every severity indicator must have a non-color secondary cue:
- Severity dots: show the number (1-5) inside each dot, or below it
- Bar charts: add the numeric value at the top of each bar
- Use both height AND a number label on chart bars
- Add text labels at the extremes: "Mild" on left, "Severe" on right

### G4. Touch targets too small
Several interactive elements (especially chart day labels, nav icons, and severity dots) appear to be under 44x44pt.

**Fix:** Every tappable element must be minimum 44x44pt. Use hitSlop if the visual element needs to be smaller than the touch target.

### G5. Navigation bar lacks visual separation
The bottom nav icons are all the same grey tone and don't look like individual buttons. The active state is barely distinguishable.

**Fix:**
- Active tab: filled icon in #E8725A (coral) + text label below + small dot indicator
- Inactive tabs: outlined icon in #7A706B + text label below (no dot)
- The nav pill itself should be white/frosted glass with a subtle shadow to float above content
- Each tab needs clear visual boundaries — if icons are too close together, increase spacing

### G6. Section labels are nearly invisible
"THIS WEEK" and "TODAY'S SYMPTOMS" section headers are low-contrast, small, and get lost.

**Fix:** Section labels should be #7A706B, DM Sans 600, 11px, uppercase, letter-spacing 1.2px. On gradient backgrounds (Home, Log), use white at 80% opacity. They must be clearly readable — if they're not, increase the size to 12px or the weight to 700.

---

## PER-SCREEN AUDIT

---

### SCREEN 1: HOME (home-screen-hig-v1.png)

**What's wrong:**
1. The THIS WEEK bar chart has a "today" dot indicator that pushes Friday's bar upward, misaligning it with the other days. The visual rhythm is broken.
2. In TODAY'S SYMPTOMS, there is a thin white line segment to the right of each symptom's horizontal bar. It appears to serve no purpose and looks like a rendering bug.
3. The bar chart bars are all the same coral color — you can't tell which symptom is which without reading the tiny label.
4. Day-of-week labels (S S M T W T F) under the charts are very small and low contrast.
5. The greeting text ("Good morning,") and the name ("Julia") both compete with the background gradient — the greeting especially is barely visible.
6. The "Log Today's Symptoms" CTA button blends into the gradient. It should be the most prominent element on the screen.

**Specific fixes:**
- Remove the dot-pushes-bar-up behavior. If you need to indicate "today," use a bold/underlined day label or a subtle background highlight on that column — do NOT change the bar's vertical position.
- Remove the mystery white line segments in TODAY'S SYMPTOMS. If they're supposed to show remaining capacity (like a track behind the fill), make the track visually distinct: use a light gray (#E5E0DD) track with the colored fill bar on top.
- Color each symptom's bars using that symptom's assigned color (see G2).
- Add numeric severity value at the top of each bar (or as a tooltip).
- Make day labels 13px minimum, DM Sans 500, white at 80% opacity.
- "Good morning," should be white at 70% opacity, 14px. "Julia" should be pure white, 32px, DM Sans 700. Both should have a subtle text shadow for legibility over the gradient.
- The CTA should be a solid white or frosted glass button with coral text, or a high-contrast coral button with white text — NOT a translucent coral button on a coral background.

---

### SCREEN 2: TODAY'S LOG (todays-log-hig-v1.png)

**What's wrong:**
1. Severity dots are all coral/salmon tones — nearly identical colors for different severity levels. A user tapping quickly can't tell which level they selected.
2. The note input area is a thin line at the bottom that looks like a divider, not an input field.
3. The "Save" button is translucent coral on coral gradient — same CTA visibility problem as Home.
4. Symptom cards don't have enough visual separation from each other. They blend into one continuous coral block.
5. No "Mild" / "Severe" labels visible on the severity dots.

**Specific fixes:**
- Severity dots must use the full severity color scale: sage(1) → sage-amber(2) → amber(3) → coral(4) → terracotta(5). Show the number inside or directly below each dot.
- Add "Mild" and "Severe" micro-labels at the left and right ends of the dot row.
- Selected dot: filled with severity color + 1.2x scale animation + number visible. Unselected: outline only, white border.
- Note input: give it a proper glass card treatment with placeholder text ("Add a note... (optional)"), visible borders, and padding. It should look like something you tap to type into.
- Save button: solid white button with coral text, or invert — just make it pop. It's the most important action.
- Symptom cards: add 12px vertical spacing between cards. Each card should be a distinct glass card with clear edges.

---

### SCREEN 3: ONBOARDING STEP 1 (onboarding-step1-hig-v1.png)

**What's wrong:**
1. The symptom selection chips are coral on a coral-tinted background. Selected vs unselected states are very hard to distinguish.
2. Progress indicator (dots or step count at top) is barely visible.
3. The layout feels cramped — chips are close together with minimal padding.

**Specific fixes:**
- Background should be flat warm cream (#FDF8F5), NOT gradient. Onboarding needs maximum clarity.
- Unselected chips: white background, light border (#E5E0DD), dark text (#2D2926).
- Selected chips: #FADED4 (peach) background, #E8725A border, #C2553F text. Each chip should also show its symptom-specific icon in its symptom color.
- Progress dots: 3 dots, current = filled coral, future = outlined coral, completed = filled coral with check. Make them at least 10px diameter with 12px spacing.
- Chip grid: 8px gap minimum between chips. Each chip needs 12px horizontal padding, 8px vertical.
- Counter pill ("2/5 selected"): clearly visible at top, bg #FADED4, text #C2553F.

---

### SCREEN 4: ONBOARDING STEP 2 (onboarding-step2-hig-v1.png)

**What's wrong:**
1. **CRITICAL: The "Next" button overlaps the time picker.** The button is laid directly over the picker wheel, obscuring part of it and making both elements unusable.
2. The time display and the picker may be redundant — showing the time twice.
3. The "Skip for now" option is nearly invisible.

**Specific fixes:**
- Fix the layout so the time picker and the Next button DO NOT OVERLAP. Use a flex layout:
  - Top: header text + subtext
  - Middle (flex: 1): time picker, vertically centered
  - Bottom (fixed): "Skip for now" text link (16px, #7A706B) + "Next" button (solid coral, full-width, 56px height)
  - Add at least 24px between the bottom of the picker and the top of the Skip link.
- If showing a large time display AND a picker wheel, remove the large time display — it's redundant. Just show the picker.
- "Skip for now" should be clearly tappable — 44px touch target, centered text.

---

### SCREEN 5: ONBOARDING STEP 3 (onboarding-step3-hig-v1.png)

**What's wrong:**
1. The "You're all set" confirmation screen has low visual hierarchy — everything is roughly the same visual weight.
2. The symptom list doesn't show which symptoms were actually selected, or it's hard to tell.
3. The "Start Tracking" CTA may not stand out enough.

**Specific fixes:**
- Add a success icon or illustration at the top — a simple checkmark in a sage (#7EB8A4) circle, or a small celebratory illustration. This gives emotional payoff.
- "You're all set" — DM Sans 700, 28px, #2D2926. Make it the biggest text on screen.
- Symptom list: white cards with each symptom's unique icon and color. Show the icon, the name, and a subtle colored left border matching the symptom color.
- Reminder summary: "Reminder set for 8:00 PM" in a small pill, or "No reminder" with an option to add one.
- "Start Tracking" button: solid coral (#E8725A), full-width, 56px, white text. This is the final conversion point — make it impossible to miss.

---

### SCREEN 6: HISTORY (history-hig-v1.png)

**What's wrong:**
1. The screen appears to show an empty or near-empty state but it's hard to tell — the visual hierarchy doesn't clearly communicate "you have no history yet" vs "here's your history."
2. Calendar strip (if present) has tiny day indicators.
3. The background has coral tinting that's unnecessary for a content-heavy screen.

**Specific fixes:**
- Use flat cream background (#FDF8F5) — NO gradient on content screens.
- Empty state: center a simple SVG illustration (journal or leaf), large text "No logs yet" (#2D2926, 22px, bold), subtext "Start with today — it only takes 30 seconds" (#7A706B, 15px), and a "Log Today" button (solid coral).
- Populated state: white cards for each day's log with a colored left accent bar showing average severity for that day. Show date, symptom dots (each in its symptom color), and truncated note preview.
- Calendar week strip at top: circles for each day, sized at minimum 36px, with severity color fill. Today outlined in coral. Tappable — 44x44pt targets.

---

### SCREEN 7: TRENDS (trends-hig-v1.png)

**What's wrong:**
1. The trends screen appears mostly empty with low-contrast elements.
2. Time range selector (7D/30D/etc.) may be hard to see or tap.
3. No clear visual indication of what data is being shown.

**Specific fixes:**
- Flat cream background (#FDF8F5).
- Time range toggle: pill-shaped selector, full width. Active segment: coral background (#E8725A), white text. Inactive: white background, #7A706B text. Each segment must be at least 44px tall.
- Trend cards (one per symptom): white card, symptom icon and name at top left in symptom color, average badge at top right ("avg 3.2" in a #FADED4 pill).
- Chart: smooth area chart (not bar chart) with the symptom's color as fill gradient. X axis shows day labels. Y axis implicit but add gridlines at severity 1,3,5 as faint horizontal lines.
- Each chart should show actual numbers — either on hover/tap, or as labels on data points.
- If free user tries to see 30D+, show a tasteful premium gate card (not a modal).

---

### SCREEN 8: SETTINGS (settings-hig-v1.png)

**What's wrong:**
1. Settings rows may lack visual separation — common problem where everything blends together.
2. Section headers might be hard to see.
3. Destructive actions (sign out, delete) may not be visually distinct from normal actions.

**Specific fixes:**
- Flat cream background (#FDF8F5).
- Group settings into white cards by section: "My Symptoms," "Reminder," "Account," "Export," "About."
- Section labels: uppercase, 11px, DM Sans 600, #7A706B, 8px above each card.
- Each row inside a card: 52px minimum height, left-aligned icon + label, right-aligned value or chevron. Separator lines between rows (1px, #F0EBE8).
- Destructive actions: red text (#D64545), no background. "Sign Out" and "Delete Account" should look different from normal navigation rows.
- "My Symptoms" section: show each symptom with its unique icon and color, plus a drag handle for reordering and an X for deletion.
- Premium upsell: a subtle card at top with "Unlock Premium" — not aggressive, just present.

---

## IMPLEMENTATION ORDER

Do not try to fix everything at once. Work through screens in this order:

1. **Home Screen** — This is the most-seen screen and has the most issues. Fix it first.
2. **Today's Log** — Second most important, it's the core interaction.
3. **Onboarding Step 2** — The button-overlapping-picker is a blocking usability bug.
4. **Onboarding Steps 1 and 3** — Quick fixes, mostly contrast and chip states.
5. **History** — Needs proper empty state and populated state.
6. **Trends** — Charts and premium gate.
7. **Settings** — Least urgent, mostly structural.

## FOR EACH SCREEN:
1. Read the specific fixes above
2. Make the code changes
3. Take a screenshot in the simulator
4. Run `node scripts/compare-screens.mjs` against the previous version if a baseline exists
5. Save the new screenshot as `design/mockups/[screen]-accessible-v1.png`
6. Move to the next screen

## REFERENCE FILES
- Design system tokens: `design/specs/design-system-v2.md`
- Current mockup index: `design/mockups/MOCKUPS.md`
- Theme file to update: `app/src/theme.ts`

---

## WHAT "DONE" LOOKS LIKE

When all screens are complete, a user should be able to:
- Instantly tell which symptom is which by color AND icon
- Read all text comfortably without squinting
- Understand severity levels without seeing color (numbers/labels visible)
- Tap every interactive element on the first try (no tiny targets)
- Navigate the app without confusion about which tab they're on
- Feel calm using the app, not overwhelmed by visual noise

The app should look warm, professional, and distinct — NOT like Bearable (teal/clinical), Daylio (colorful/playful), or a generic health app. It should feel like a quiet, supportive companion for someone having a hard day.
