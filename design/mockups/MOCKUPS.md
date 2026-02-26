# Ebb — Liquid Glass Mockups Index

All mockup images in this directory are **approved Liquid Glass designs** for Claude Code to implement.
Reference `design/specs/design-system-v2.md` for tokens and component specs.

---

## Onboarding Flow (3 screens)

| File | Screen | Notes |
|------|--------|-------|
| `onboarding-welcome-liquid-glass-v2.png` | **Onboarding Step 1 — Welcome / Symptom Selection** | Warm blob background, progress dots, symptom picker cards |
| `onboarding-reminder-liquid-glass-v1.png` | **Onboarding Step 2 — Reminder Time** | Glass time display card, frosted glass picker, coral CTA |
| `onboarding-confirmation-liquid-glass-v1.png` | **Onboarding Step 3 — "You're all set"** | Sage success badge, glass symptom list card, reminder pill, coral Start Tracking CTA |

---

## Main App Screens

| File | Screen | Notes |
|------|--------|-------|
| `home-screen-liquid-glass-APPROVED.png` | **Home Screen** ✅ APPROVED | Full coral gradient bg, THIS WEEK bar chart panel (icon+label above bars, Mon–Sun, today=Tue bold+dot), TODAY'S SYMPTOMS panel, Log CTA, floating glass pill nav |
| `todays-log-liquid-glass-v1.png` | **Today's Log** | Full coral gradient bg, glass symptom cards with 5-dot severity (Mild→Severe), glass note field, floating nav |
| `history-liquid-glass-v1.png` | **History** | Warm blob cream bg, frosted glass calendar week row (today has coral circle), empty state with glass icon |
| `trends-liquid-glass-v1.png` | **Trends** | Warm blob cream bg, glass pill segmented control (7D/30D/90D/All), empty state |
| `settings-liquid-glass-v1.png` | **Settings — Account / Premium / Export / About** | Cream bg, glass cards per section, coral outlined sign-in button, gradient Upgrade pill, colored CSV/PDF export rows |
| `settings-symptoms-liquid-glass-v1.png` | **Settings — My Symptoms + Reminder** | Symptom list with × delete, glass Add input + coral Add button, plan note, glass time picker |

---

## Auth

| File | Screen | Notes |
|------|--------|-------|
| `create-account-liquid-glass-v1.png` | **Create Account bottom sheet** | Frosted glass sheet over dimmed/blurred Settings bg, glass input fields, coral gradient CTA, sign-in link |

---

## Design System Reference
- **Spec:** `design/specs/design-system-v2.md`
- **Background (gradient screens):** coral topographic gradient (`#F5A962 → #E8725A → #C2553F`)
- **Background (content screens):** cream `#FDF8F5` + warm amber/coral blobs
- **Glass cards:** `rgba(255,255,255,0.52)` + `backdrop-filter: blur(28px) saturate(180%)` + white border + warm shadow
- **Floating nav:** full pill `border-radius:100px`, frosted glass, active tab = filled coral icon + label + dot
- **Primary CTA:** `linear-gradient(145deg, #E8725A, #C2553F)` + warm shadow
- **Typography:** DM Sans, 700 for headings, 600 for labels, 400/500 for body
