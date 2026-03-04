# Onboarding Screen 1 — "What to Track?" (Liquid Glass Redesign)

**File:** `app/src/screens/OnboardingSymptomSelect.tsx` (or equivalent)
**Status:** Design approved ✅
**Mockup:** `design/wireframes/ebb-onboarding-liquid.html`

---

## Overview

The first onboarding screen where the user selects up to 5 symptoms to track. Redesigned with Liquid Glass UI conventions, warm topographic color system, and Lucide SVG icons.

---

## Layout Structure

```
StatusBar
ProgressDots (step 1 of 3)
Header (h1 + subtitle)
CounterBadge ("0 / 5 selected")
GlassPanel → SymptomChips (wrapping flex)
CustomInputRow (text input + Add button)
NextButton (bottom-right)
HintText ("X selected · tap any to deselect")
```

---

## Background

- Multi-layer radial gradient blobs over a base cream-to-coral linear gradient
- Colors:
  - Base: `#FDF8F5` → `#FEF0E8` → `#FBDDD0`
  - Blob 1 (top-left): `#F5A962` at 34% opacity
  - Blob 2 (top-right): `#E8725A` at 27% opacity
  - Blob 3 (bottom-center): `#C2553F` at 20% opacity
- Implementation: Use `expo-linear-gradient` + absolutely-positioned `react-native-svg` radial blurs, or a static PNG background asset

---

## Progress Indicator

- 3 dots in a row, centered
- Inactive dot: `8×8` circle, `rgba(194,85,63,0.25)`
- Active dot: `24×8` pill shape (rounded rect), `#C2553F`
- Gap between dots: `8px`

---

## Header

```
h1: "What do you want to track?"
  fontSize: 34, fontWeight: 700, color: #2A160B, letterSpacing: -0.5
  lineHeight: 1.15

subtitle: "Pick up to 5. You can always change these later."
  fontSize: 16, fontWeight: 400, color: #7A4532, lineHeight: 1.4
```

---

## Counter Badge

Glass capsule pill, displayed below the subtitle.

```
Container:
  background: rgba(255,255,255,0.55)
  backdropFilter: blur(20px) saturate(180%)
  borderRadius: 20
  border: 1px solid rgba(255,255,255,0.75)
  paddingVertical: 7, paddingHorizontal: 16
  shadow: { color: #C2553F, opacity: 0.12, radius: 12, offset: {0,2} }
  innerShadow top: rgba(255,255,255,0.8)

Dot indicator:
  7×7 circle, background: #E8725A

Label:
  "X / 5 selected" — fontSize: 14, fontWeight: 600, color: #C2553F
```

Updates dynamically as chips are selected.

---

## Symptom Chips Panel (Glass Container)

Wrapping flex container with frosted glass panel background.

### Panel styles:
```
background: rgba(255,255,255,0.38)
backdropFilter: blur(28px) saturate(200%)
borderRadius: 28
border: 1px solid rgba(255,255,255,0.7)
padding: 20px 16px 16px
shadows:
  - { color: #C2553F, opacity: 0.10, radius: 32, offset: {0,8} }
  - { color: #C2553F, opacity: 0.06, radius: 8, offset: {0,2} }
Specular highlight: white-to-transparent gradient overlay on top half of panel
```

### Chip styles (unselected):
```
flexDirection: row, alignItems: center, gap: 8
paddingVertical: 10, paddingHorizontal: 18
borderRadius: 50 (full pill)
background: rgba(255,255,255,0.50)
backdropFilter: blur(12px)
border: 1px solid rgba(255,255,255,0.8)
shadow: { color: #C2553F, opacity: 0.08, radius: 8, offset: {0,2} }
innerShadow top: rgba(255,255,255,0.9)
fontSize: 14, fontWeight: 500, color: #3D2416
```

### Chip styles (selected):
```
background: rgba(232,114,90,0.18)
border: 1px solid rgba(232,114,90,0.45)
shadows:
  - { color: #E8725A, opacity: 0.22, radius: 16, offset: {0,4} }
innerShadow top: rgba(255,220,200,0.7)
innerShadow bottom: rgba(194,85,63,0.12)
fontSize: 14, fontWeight: 600, color: #C2553F
```

---

## Symptom List with Icons

Use **Lucide React Native** icons (`lucide-react-native` package).
Icon size: `18×18`, strokeWidth: `2`.

| Symptom | Lucide Icon | Icon Color |
|---|---|---|
| Pain | `Flame` | `#E8725A` |
| Fatigue | `BatteryLow` | `#F5A962` |
| Brain Fog | `Cloud` | `#8FA4C0` |
| Nausea | `Waves` | `#5BAFA5` |
| Headache | `Zap` | `#E8B84B` |
| Anxiety | `HeartPulse` | `#D97090` |
| Dizziness | `RefreshCw` | `#9B7EC8` |
| Joint Pain | `Bone` | `#D4834A` |
| Sleep Quality | `Moon` | `#7B8EC4` |
| Mood | `Smile` | `#7BC47B` |

Default symptoms shown (all 10 above). User can add custom symptoms via the input field.
Max selection: **5 chips**.

---

## Custom Symptom Input Row

```
Container (glass):
  flexDirection: row, alignItems: center
  paddingLeft: 20, paddingRight: 6, paddingVertical: 6
  borderRadius: 20
  background: rgba(255,255,255,0.55)
  backdropFilter: blur(24px) saturate(180%)
  border: 1px solid rgba(255,255,255,0.75)
  shadow: { color: #C2553F, opacity: 0.10, radius: 20, offset: {0,4} }
  innerShadow top: rgba(255,255,255,0.85)

TextInput:
  flex: 1
  placeholder: "e.g. Heart Rate"
  placeholderTextColor: rgba(122,69,50,0.45)
  fontSize: 15, color: #3D2416

Add Button:
  paddingVertical: 11, paddingHorizontal: 22
  borderRadius: 14
  background: linear-gradient(145deg, #E8725A → #C2553F)
  shadow: { color: #C2553F, opacity: 0.40, radius: 14, offset: {0,4} }
  innerShadow: rgba(255,255,255,0.2) top
  label: "Add", fontSize: 15, fontWeight: 600, color: white
```

Tapping Add appends the custom symptom to the grid with a generic `Tag` (Lucide) icon in `#B0B0B0`.

---

## Next Button

Bottom-right aligned.

```
paddingVertical: 16, paddingHorizontal: 32
borderRadius: 20
background: linear-gradient(145deg, #E8725A → #C2553F)
shadows:
  - { color: #C2553F, opacity: 0.45, radius: 28, offset: {0,8} }
  - { color: #C2553F, opacity: 0.25, radius: 8, offset: {0,2} }
innerShadow top: rgba(255,255,255,0.25)
innerShadow bottom: rgba(0,0,0,0.08)
Specular gloss: white gradient overlay top 50%
label: "Next", fontSize: 17, fontWeight: 600, color: white
icon: Lucide ArrowRight, 20×20, strokeWidth: 2.5, color: white
```

Disabled state (0 selected): reduce opacity to 0.5, disable press.

---

## Hint Text

Below the Next button, centered:
```
"X selected · tap any to deselect"
fontSize: 13, color: rgba(122,69,50,0.55)
Hidden when 0 selected.
```

---

## Behavior / State

- `selectedSymptoms: string[]` — max 5
- Tapping a chip toggles selection; if already at 5 and tapping unselected chip, ignore (optionally shake/pulse)
- Counter badge updates live
- "Next" navigates to onboarding screen 2
- Custom symptoms added via input are appended to the grid with a neutral icon

---

## Dependencies

```bash
npx expo install lucide-react-native react-native-svg
```

`lucide-react-native` requires `react-native-svg` as a peer dependency.

---

## Tokens Reference

All colors from `theme.ts` warm topographic palette:
```ts
coral:      '#E8725A'
terracotta: '#C2553F'
amber:      '#F5A962'
cream:      '#FDF8F5'
darkBrown:  '#2A160B'
midBrown:   '#3D2416'
warmBrown:  '#7A4532'
```
