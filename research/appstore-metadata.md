# App Store Metadata — Ebb
**Prepared by:** Builder 🏗️  
**Date:** February 2026  
**Status:** Draft — ready for Julia to review before submission

---

## App Name (30 chars)
```
Ebb: Symptom & Flare Tracker
```
*(28 chars — within limit)*  
**Why:** Brand first. "Symptom" and "Flare" are the two highest-value keywords in our tier. This is the only metadata field Apple gives extra weight to — every word counts.

---

## Subtitle (30 chars)
```
Daily chronic illness log
```
*(25 chars)*  
**Why:** Hits "chronic illness" (high-intent) and "daily log" without repeating words from the name. Avoids repeating "tracker" (already in name, Apple deduplicates).

---

## Keyword Field (100 chars, comma-separated, no spaces)
```
chronic,illness,pain,fatigue,fibromyalgia,flare,diary,brain,fog,lupus,EDS,POTS,MECFS,journal
```
*(94 chars — within limit)*  

**Notes:**
- No repeats of words in App Name or Subtitle (Apple ignores duplicates)
- "brain" + "fog" separately gets more matches than "brain fog"
- "MECFS" without hyphen — Apple doesn't handle hyphens well in keyword field
- "flare" in keywords even though it's in the name — the name keyword field and this are separate in Apple's indexing

---

## Primary Category
**Health & Fitness**

## Secondary Category
**Medical**

---

## App Description (4,000 chars max)

```
Ebb is the symptom tracker for when you're too tired for symptom trackers.

Log how you're feeling in under 30 seconds — no fuss, no friction. Just tap your symptoms, rate each one 1 to 5, add a quick note if you want, and you're done. Every single day, in half a minute.

--- WHY EBB? ---

Most symptom apps are built for people who have energy. Bearable is powerful — but it's a lot. If you've got fibromyalgia, ME/CFS, lupus, EDS, POTS, or any chronic illness that robs you of energy and focus, you don't want to spend five minutes logging. You want to spend thirty seconds.

Ebb is designed around that reality. Brain fog friendly. Minimal taps. Nothing unnecessary.

--- WHAT YOU GET ---

• 30-second daily check-in — rate each symptom 1–5, one note, done
• Track any symptom — pain, fatigue, brain fog, nausea, sleep quality, mood, or your own
• 7-day trend view on your home screen — spot patterns at a glance
• Full history — scroll back through every logged day
• Trends charts — see how each symptom behaves over time
• Daily reminders — a gentle nudge at whatever time works for you
• Private by default — everything stays on your device

--- FREE vs PREMIUM ($2.99/month) ---

Free:
✓ Track up to 5 symptoms
✓ Full logging and history
✓ 7-day trends
✓ Daily reminders
✓ CSV export

Premium:
✓ Everything in Free
✓ Unlimited symptoms
✓ Unlimited history (beyond 30 days)
✓ Doctor-ready PDF reports with charts
✓ Full trends (30/90/all-time)

--- THE DOCTOR REPORT (Premium) ---

Ebb's PDF export was built specifically for that appointment moment — when your doctor asks how you've been and you can't remember. Generate a clean report covering any date range, with your symptoms, daily ratings, notes, and charts. Print it, email it, AirDrop it. Walk in prepared.

--- DESIGNED FOR REAL LIFE ---

If you have fibromyalgia, ME/CFS, lupus, EDS, POTS, Crohn's, or any condition with unpredictable flares, Ebb was built with you in mind. Not for people who want to quantify every biometric. For people who just want to remember how they felt, see if it's getting better or worse, and share that with their care team.

Track the ebb and flow of how you feel. That's it.
```

*(~2,100 chars — well within 4,000)*

---

## What's New (first submission)
```
Welcome to Ebb — track your symptoms in 30 seconds a day.
```

---

## Support URL
```
https://getebb.app/support
```
*(Placeholder — set up a simple page before submission)*

## Marketing URL (optional)
```
https://getebb.app
```

## Privacy Policy URL (required)
```
https://getebb.app/privacy
```
*(Required for apps that collect any data — even local — Apple now requires this)*

---

## App Store Screenshots — Shot List

Screenshots should tell a story in 3 shots (iPhone 6.9" = 1320×2868px):

### Screenshot 1 — The Hook
- **Headline:** "Log in 30 seconds"
- **Show:** Daily Log screen with 2 symptoms being rated
- **Caption:** "Quick, fog-friendly daily check-in"
- **Goal:** Immediately differentiate from Bearable ("30 seconds" is our positioning)

### Screenshot 2 — The Trend
- **Headline:** "See your patterns"
- **Show:** Home screen with 7-day trend grid, colors clearly visible
- **Caption:** "Spot what makes you better or worse"
- **Goal:** Show the "why" — patterns are why people track

### Screenshot 3 — The Doctor Report
- **Headline:** "Walk into appointments prepared"
- **Show:** PDF export mockup (can be simulated in Figma)
- **Caption:** "Premium: generate a report for your care team"
- **Goal:** Premium conversion hook — this is the paywall moment

### Screenshot 4 — History
- **Headline:** "Every day, remembered"
- **Show:** History list with color-coded severity bars
- **Goal:** Show completeness of the app

### Screenshot 5 — Onboarding
- **Headline:** "Set up in 2 minutes"
- **Show:** Symptom chip picker with suggestions
- **Goal:** Remove friction fear — "this is fast to start"

---

## Age Rating

Answer the App Store questionnaire:
- Medical/Treatment Information: **No** (we display user-entered data, not medical advice)
- All other categories: No

**Expected rating: 4+**

---

## Review Notes (for App Store reviewer)

```
Ebb is a simple daily symptom logging app for people with chronic illness. 

To test the core flow:
1. Launch the app and complete onboarding (select any symptoms, set or skip reminder)
2. Tap "Log Today" on the Home screen and rate symptoms
3. View History and Trends tabs

No login required. No network calls made. All data stored locally on device.

Test account: N/A (no login required in free tier)
```

---

## Pricing

- **Free** (base app)
- **Ebb Premium** — $2.99/month or $14.99/year
  - Set up in App Store Connect → In-App Purchases → Auto-Renewable Subscriptions
  - Product IDs: `com.julia.ebb.premium.monthly`, `com.julia.ebb.premium.yearly`
  - 14-day free trial recommended (increases conversion)
