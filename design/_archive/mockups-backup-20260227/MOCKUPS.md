# Ebb — Design Mockups Index

## IMPORTANT: Design Direction Change

**The liquid glass mockups are OUTDATED and should NOT be matched.** They have accessibility failures including poor contrast ratios, color-only severity indicators, and insufficient visual separation between UI elements.

**The `-hig-v1` files are the current baseline** but still need accessibility improvements. Use them as a starting point, not a final target.

**The goal is an accessible, HIG-compliant design that:**
- Passes WCAG 2.1 AA contrast (4.5:1 body text, 3:1 large text/UI)
- Does NOT rely on color alone for severity levels — use shapes, labels, or size
- Uses distinct visual identity per symptom (different colored icons, not all the same color)
- Has clearly separated, tappable UI elements (44x44pt minimum touch targets)
- Is easy to read and use when the user is feeling awful

---

## Current Screens (use `-hig-v1` as starting point)

| File | Screen | Known Issues to Fix |
|------|--------|-------------------|
| `home-screen-hig-v1.png` | Home | Symptom icons all same color; chart day indicator dot pushes bars up; mystery white lines in Today's Symptoms; nav bar icons blend together |
| `todays-log-hig-v1.png` | Today's Log | Check contrast on severity dots; ensure severity has non-color indicators |
| `history-hig-v1.png` | History | Check contrast and readability |
| `trends-hig-v1.png` | Trends | Check contrast and readability |
| `settings-hig-v1.png` | Settings | Check contrast and readability |
| `onboarding-step1-hig-v1.png` | Onboarding Step 1 | Check contrast and readability |
| `onboarding-step2-hig-v1.png` | Onboarding Step 2 | Check contrast and readability |
| `onboarding-step3-hig-v1.png` | Onboarding Step 3 | Check contrast and readability |

---

## Accessibility Checklist (REQUIRED for every screen)

Before considering any screen complete:
- [ ] Every text/background color pair has been checked for WCAG AA contrast (4.5:1 body, 3:1 large text)
- [ ] Severity levels are distinguishable without color (use shapes, numbers, or labels)
- [ ] Each tracked symptom has a visually distinct icon/color — not all the same
- [ ] All touch targets are at minimum 44x44pt
- [ ] Navigation items look like separate, distinct buttons
- [ ] The screen is readable in bright sunlight and dim lighting
- [ ] Tested against protanopia, deuteranopia, and tritanopia color blindness

---

## Design System Reference
- **Spec:** `design/specs/design-system-v2.md`
- **Typography:** DM Sans, 700 for headings, 600 for labels, 400/500 for body
- **Minimum body text:** 16px. Absolute minimum secondary text: 14px.

## Outdated Files (DO NOT USE)
All files with `liquid-glass` in the name are superseded. They remain in the folder for reference only.
