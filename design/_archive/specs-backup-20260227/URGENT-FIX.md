# URGENT FIX — Glass Effect Is Destroying All Contrast

## The Root Cause

The GlassCard component uses `backgroundColor: rgba(255,255,255,0.18)` over the coral gradient background. This creates a salmon-tinted translucent card that makes ALL content inside it low-contrast. The symptom colors you added to theme.ts exist but are invisible because the card itself is tinted coral.

**The liquid glass aesthetic is actively harming usability. It must be replaced on content-heavy screens.**

## What To Do

### Step 1: Replace GlassCard on Home and DailyLog screens

On gradient background screens (Home, DailyLog), cards that contain DATA (charts, symptom rows, severity selectors) must use:
```typescript
backgroundColor: '#FFFFFF',  // solid white, NOT translucent
borderRadius: 22,
shadowColor: 'rgba(0,0,0,0.08)',
shadowOffset: { width: 0, height: 4 },
shadowRadius: 16,
elevation: 4,
padding: 16,
```

Do NOT use BlurView, do NOT use rgba backgrounds on data cards. The warm coral gradient background peeks out between and around the cards — that's enough brand color. The cards themselves must be opaque white so their contents are readable.

You can keep the glass effect ONLY on the bottom nav bar and the CTA button where there's no dense content.

### Step 2: Use the symptom colors you already defined

You already added `getSymptomColor()` to theme.ts and imported it in HomeScreen. The colors are there. But they're invisible on the salmon-tinted glass cards. Once the cards are white, these colors will actually show:

- Pain icon/bars: #C2553F (terracotta)
- Fatigue icon/bars: #E8725A (coral)
- Brain Fog icon/bars: #7EB8A4 (sage green)

**Make sure the icon container background for each symptom uses that symptom's color at 15% opacity**, and the icon stroke uses the full color. Example:
```typescript
// Icon container for Pain
backgroundColor: 'rgba(194, 85, 63, 0.15)',  // terracotta at 15%
// Icon stroke color
color: '#C2553F'  // solid terracotta
```

### Step 3: Fix the THIS WEEK chart bars

Each symptom's bars must use that symptom's color, not all the same color. The bars should be:
- Pain bars: #C2553F
- Fatigue bars: #E8725A
- Brain Fog bars: #7EB8A4

The today column: bold the day label and add a subtle background highlight on the column. Do NOT use a dot that pushes bars up.

Add the numeric severity value (1-5) above each bar in small text (11px, #2D2926).

### Step 4: Fix TODAY'S SYMPTOMS section

- Remove the mystery thin white lines next to the bars
- The bar track (unfilled portion) should be #F0EBE8 (warm light gray)
- The bar fill should use each symptom's unique color
- Show the numeric severity value to the right of the bar (e.g., "3" or "—" if not logged)
- The dash character currently shown should only appear if there's no data. If there IS data, show the number.

### Step 5: Fix the DailyLog severity dots

The dots have numbers inside them now (good), but they're all the same faint coral outline against the salmon glass card. Once the card is white:
- Unselected dots: #E5E0DD border, no fill, number in #7A706B
- Selected dots: filled with the SEVERITY color from the scale (sage→amber→coral→terracotta), number in white, 1.2x scale
- The severity colors are already in theme.ts as the `severity` array — use them

### Step 6: Fix the CTA buttons

"Log Today's Symptoms" and "Save Log" buttons:
- Solid coral background (#E8725A), white text, full width
- Do NOT use translucent/glass style for primary action buttons
- 56px height, borderRadius 18, DM Sans 700 15px

### Step 7: Fix the bottom nav

- Background: solid white or very light frosted glass (intensity 90+, NOT the current low-opacity version)
- Active tab: filled icon in #E8725A + label text in #E8725A + small coral dot below
- Inactive tabs: outlined icon in #7A706B + label text in #7A706B
- Clear separation between tabs — minimum 60px per tab zone

---

## After making these changes:

1. Take a screenshot of the Home screen
2. Take a screenshot of the DailyLog screen
3. Save both as `-accessible-v2.png` in design/mockups/
4. Then proceed to the remaining screens following the same principles: white/opaque cards for content, symptom-specific colors, numeric labels on all severity indicators

## The test for "done":
- Can you tell Pain from Fatigue from Brain Fog WITHOUT reading the labels? (distinct icon colors)
- Can you read all text without squinting? (dark text on white cards)
- Can you tell severity 2 from severity 4 without color? (numbers visible)
- Does the app still feel warm and coral? (yes — from the gradient background peeking between white cards)
