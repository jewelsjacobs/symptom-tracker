# Ebb — Color Palette
**Created:** 2026-02-22 by Pixel (design agent)
**Destination:** Drop into `src/theme.ts`

---

## Light Mode

```ts
export const lightColors = {
  primary:        '#5B8FA8',  // Calm coastal slate-blue
  primaryLight:   '#A8C8D8',  // Soft sky reflection
  primaryDark:    '#3D6478',  // Deeper water
  background:     '#F4F8FB',  // Near-white, cool tint
  surface:        '#EBF3F8',  // Secondary surfaces
  card:           '#FFFFFF',  // Card backgrounds
  text:           '#1A2C36',  // Deep navy-black
  textMuted:      '#6E8E9E',  // Secondary text, hints
  textOnPrimary:  '#FFFFFF',  // Text on primary buttons
  border:         '#CFE0EC',  // Card borders, inputs
  success:        '#5CA87A',  // Logged, positive
  warning:        '#E8A55A',  // Moderate / amber
  danger:         '#C95F52',  // Severe (softened coral)
  accent:         '#C4A882',  // Warm sand, delight accent
};
```

## Dark Mode

```ts
export const darkColors = {
  primary:        '#7AAFC8',
  primaryLight:   '#4A7A93',
  primaryDark:    '#2C5068',
  background:     '#0E1C24',  // Deep navy, not pure black
  surface:        '#182D3A',
  card:           '#1C3445',
  text:           '#E4F0F7',
  textMuted:      '#7A9FB0',
  textOnPrimary:  '#0E1C24',
  border:         '#2A4558',
  success:        '#6EC48F',
  warning:        '#F0B870',
  danger:         '#E07068',
  accent:         '#D4B890',
};
```

## Severity Scale

```ts
export const severityColors = [
  '#5CA87A',  // 1 — Minimal / Mild (sage green)
  '#A0C878',  // 2 — Low
  '#E8C85A',  // 3 — Moderate (warm yellow)
  '#E8955A',  // 4 — High (amber-orange)
  '#C95F52',  // 5 — Severe (muted coral)
];
```

---

## Rationale

The name "Ebb" evokes water, tides, and the natural rhythm of how we feel each day. The palette moves away from generic wellness-purple into a calm coastal slate-blue that is:
- More distinctive on the App Store
- Deeply calming without reading clinical
- Warm enough to feel like a safe space
- Easily differentiated in both light and dark mode
