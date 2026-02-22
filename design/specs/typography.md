# Ebb — Typography Spec
**Created:** 2026-02-22 by Pixel (design agent)

---

## Font Choice: DM Sans

**Google Fonts:** https://fonts.google.com/specimen/DM+Sans
**Expo install:** `npx expo install @expo-google-fonts/dm-sans expo-font`

**Why DM Sans:**
- Rounded terminals — warm and approachable, never clinical
- Highly legible at small sizes on Retina screens
- Excellent for people with brain fog or visual stress (chronic illness users)
- Widely used in modern health and productivity apps (Notion, Linear)
- Supports full Latin character set, numbers, punctuation

**Weights to load:**
- `DM_Sans_400Regular`
- `DM_Sans_500Medium`
- `DM_Sans_600SemiBold`
- `DM_Sans_700Bold`

---

## Type Scale

```ts
export const typography = {
  displayLarge: {
    fontFamily: 'DM_Sans_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  titleLarge: {
    fontFamily: 'DM_Sans_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  titleMedium: {
    fontFamily: 'DM_Sans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  titleSmall: {
    fontFamily: 'DM_Sans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bodyLarge: {
    fontFamily: 'DM_Sans_400Regular',
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: 'DM_Sans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  label: {
    fontFamily: 'DM_Sans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: 'DM_Sans_400Regular',
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
  },
};
```

---

## Usage Guide

| Role | Style | Usage |
|---|---|---|
| `displayLarge` | 34/Bold | Onboarding hero text only |
| `titleLarge` | 28/Bold | Onboarding section headers |
| `titleMedium` | 22/SemiBold | Screen titles, section labels |
| `titleSmall` | 18/SemiBold | Symptom names, card headers |
| `bodyLarge` | 17/Regular | Body text, descriptions, settings rows |
| `bodyMedium` | 15/Regular | Secondary body, note previews |
| `label` | 13/Medium | Chips, tab bar labels, badges |
| `caption` | 12/Regular | Dates, version text, footnotes |

---

## Fallback

If DM Sans fails to load, fall back to:
- iOS: `'System'` (San Francisco — acceptable fallback)
- Android: `'sans-serif'` (Roboto)

```ts
const fontFamily = Platform.OS === 'ios' ? 'System' : 'sans-serif';
```
