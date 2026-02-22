# MVP Spec — Chronic Illness Symptom Tracker
**Created:** 2026-02-22
**Positioning:** "Track your symptoms in 30 seconds a day."
**Target user:** Person with chronic illness (fibromyalgia, ME/CFS, lupus, EDS, POTS, Crohn's, etc.) who has tried Bearable and found it overwhelming.

---

## Tech Stack (recommended)
- **Framework:** React Native (cross-platform, iOS-first)
- **Backend/Auth:** Supabase (free tier, Postgres, real-time, auth built-in)
- **Payments:** RevenueCat (handles Apple IAP, free up to $2.5k MRR)
- **Notifications:** Expo Notifications
- **PDF export:** react-native-html-to-pdf or similar
- **Charts:** Victory Native or react-native-gifted-charts

---

## Screens & Features

### 1. Onboarding (first-launch only)
- Welcome screen: "Track your health in 30 seconds a day"
- Step 1: "What symptoms do you want to track?" → text input, add up to 5 (free) / 10 (premium)
  - Suggestions offered as chips: Pain, Fatigue, Brain Fog, Nausea, Headache, Anxiety, Dizziness, Joint Pain, Sleep Quality, Mood
  - User can tap suggestions OR type custom
- Step 2: "Set a daily reminder" → time picker (default: 8pm), skip option
- Step 3: Account creation (email + password, via Supabase auth) — optional but required for PDF export
- Done → lands on Home

### 2. Home Screen
- Shows today's date + "Have you logged today?" status
- Big primary button: "Log Today" (if not yet logged)
- If already logged: shows today's summary (each symptom + its rating)
- Below: mini trend lines for each symptom (last 7 days)
- Bottom nav: Home | History | Trends | Settings

### 3. Daily Log Screen (THE core experience)
- One symptom per card, stacked vertically
- Each card: symptom name + 5-dot severity selector (1=mild, 5=severe)
  - Dots, not a slider — faster, finger-friendly
- Optional: "Add a note for today" text field at bottom (one note per day, not per symptom)
- "Save" button
- Total time to complete: under 30 seconds for 5 symptoms

### 4. History Screen
- Calendar view: color-coded dots per day (green=logged, gray=missed, red=high severity)
- Tap a day → see that day's log (symptom ratings + note)
- Infinite scroll back through logged days

### 5. Trends Screen
- One line graph per symptom
- Toggle: 7 days | 30 days | 90 days | All time
- Y-axis: 1–5 severity
- Simple, clean — no correlation engine (v1)

### 6. Doctor Report (PDF Export) — PREMIUM FEATURE
- Date range selector (default: last 30 days)
- Generates clean PDF with:
  - App name + patient name (optional, set in settings)
  - Table: date | symptom 1 | symptom 2 | ... | note
  - Trend chart image per symptom
  - Severity averages
- Share sheet to email, print, AirDrop, etc.

### 7. Settings Screen
- Manage symptoms (add/edit/delete/reorder)
- Reminder time
- Account (email, subscription status)
- Export raw data (CSV) — free feature
- Privacy policy / terms

---

## Freemium Gates

| Feature | Free | Premium ($2.99/mo or $14.99/yr) |
|---|---|---|
| Number of symptoms | 5 | Unlimited (up to 20) |
| History access | 30 days | Unlimited |
| PDF export | ❌ | ✅ |
| CSV export | ✅ | ✅ |
| Reminders | ✅ | ✅ |
| Trends charts | 7-day only | All time |

---

## Monetization
- Paywall shown after: (1) user tries to add 6th symptom, OR (2) user tries to generate PDF, OR (3) user taps "3 months ago" in history
- RevenueCat handles IAP + subscription management
- Trial: 14-day free premium trial on signup (increases conversion)

---

## App Store Metadata

**Name:** [TBD — see naming doc]
**Subtitle (30 chars):** "Daily flare & symptom log"
**Category:** Health & Fitness

**Primary keywords to target:**
- symptom tracker
- chronic illness tracker
- flare tracker
- pain diary
- fatigue tracker
- fibromyalgia tracker
- ME CFS tracker
- health log

**Keyword field (100 chars):** symptom,tracker,chronic,illness,flare,pain,diary,fatigue,log,fibromyalgia,lupus,EDS,POTS,daily

---

## Build Estimate
- **Week 1:** Onboarding, Daily Log screen, local storage (AsyncStorage)
- **Week 2:** History, Trends (charts), Supabase sync, auth
- **Week 3:** PDF export, RevenueCat IAP, Settings, polish
- **Week 4:** TestFlight beta, bug fixes, App Store submission

Total: ~3–4 weeks with AI assistance (Claude Code / Codex)

---

## Post-Launch Growth (organic only)
1. Post on r/ChronicIllness, r/Fibromyalgia, r/ME_CFS, r/POTS, r/EhlersDanlos — *genuine* post, not spam
2. Answer "what app do you use?" threads with your experience
3. Reach out to 2–3 chronic illness micro-bloggers for honest reviews
4. ASO optimization: update keywords based on what's driving installs (App Store Connect analytics)
