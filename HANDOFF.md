# Ebb — Claude Code Handoff

## Project Location
`~/projects/symptom-tracker/`

## Current Status (Feb 25, 2026)
The app is **functionally complete** — all core features work (onboarding, daily log, history, trends, settings, Supabase sync, RevenueCat, PDF/CSV export, push notifications). 

**What needs to happen now:** Apply the final **Liquid Glass design system** to every screen. New approved mockups have been created and are ready to implement.

---

## Approved Mockups — WHERE TO FIND THEM
All mockup images are in:
```
~/projects/symptom-tracker/design/mockups/
```

See `design/mockups/MOCKUPS.md` for the full index with descriptions.

**Quick reference:**
| Mockup File | Screen |
|---|---|
| `home-screen-liquid-glass-APPROVED.png` | Home Screen ✅ |
| `todays-log-liquid-glass-v1.png` | Today's Log / Daily Log |
| `onboarding-welcome-liquid-glass-v2.png` | Onboarding Step 1 |
| `onboarding-reminder-liquid-glass-v1.png` | Onboarding Step 2 |
| `onboarding-confirmation-liquid-glass-v1.png` | Onboarding Step 3 |
| `history-liquid-glass-v1.png` | History Screen |
| `trends-liquid-glass-v1.png` | Trends Screen |
| `settings-liquid-glass-v1.png` | Settings (Account/Premium/Export/About) |
| `settings-symptoms-liquid-glass-v1.png` | Settings (My Symptoms + Reminder) |
| `create-account-liquid-glass-v1.png` | Create Account modal |

---

## Design System
Full spec: `design/specs/design-system-v2.md`

### Two background types in use:
**Gradient screens** (Home, Today's Log, Onboarding):
```js
// LinearGradient colors
['#F5A962', '#E8725A', '#C2553F', '#7a3020']
// + SVG contour lines overlay at 8% opacity
```

**Cream screens** (History, Trends, Settings):
```js
// Background
backgroundColor: '#FDF8F5'
// + radial gradient blobs (amber + coral, blur 55px, low opacity)
```

### Glass card pattern (all screens):
```js
background: 'rgba(255,255,255,0.52)'
backdropFilter: 'blur(28px) saturate(180%)'
borderRadius: 22
border: '1px solid rgba(255,255,255,0.78)'
boxShadow: '0 8px 32px rgba(194,85,63,0.10), inset 0 1px 0 rgba(255,255,255,0.90)'
```
On gradient screens, use lighter glass: `rgba(255,255,255,0.18)` + `rgba(255,255,255,0.30)` border.

### Floating pill nav (ALL screens):
```js
position: 'absolute', bottom: 22, left: 20, right: 20
background: 'rgba(255,255,255,0.75)' + blur(40px)
borderRadius: 100  // full pill
// Active tab: filled coral icon (#E8725A) + label + dot
// Inactive: outline icon (opacity 0.38) + muted label
```

### Primary CTA button:
```js
background: 'linear-gradient(145deg, #E8725A, #C2553F)'
borderRadius: 20, height: 56
boxShadow: '0 8px 28px rgba(194,85,63,0.45)'
```

### Typography: DM Sans throughout
- Page titles: 700, 34–36px
- Card labels: 700, 10px, letter-spacing 1.3px, uppercase
- Body: 400/500, 14–16px
- Buttons: 700, 17px

### Colors:
```js
coral:     '#E8725A'  // primary
terracotta:'#C2553F'  // primary dark
amber:     '#F5A962'  // accent
cream:     '#FDF8F5'  // background
darkBrown: '#2A160B'  // text primary
midBrown:  '#3D2416'  // text secondary
warmBrown: '#7A4532'  // text muted
sage:      '#7EB8A4'  // success/green
```

---

## Source Code Structure
```
src/
  screens/
    HomeScreen.tsx
    DailyLogScreen.tsx
    HistoryScreen.tsx
    TrendsScreen.tsx
    SettingsScreen.tsx
    OnboardingScreen.tsx
  components/
    GlassCard.tsx
    GradientBackground.tsx
    SeverityDots.tsx
    SymptomIcon.tsx
    BottomNav.tsx
  theme.ts           ← v2 tokens already in place
  supabase/
  purchases/
  notifications/
  export/
```

---

## Notes for Claude Code
- **Do NOT auto-submit to App Store** — Julia does that manually
- The existing `GlassCard`, `GradientBackground`, `SeverityDots`, `SymptomIcon`, `BottomNav` components already exist in `src/components/` — use them
- `theme.ts` already has v2 color tokens — use them
- DM Sans is already loaded in `App.tsx`
- Match the mockup images as closely as possible
- Test on iPhone (Expo dev build already set up)
