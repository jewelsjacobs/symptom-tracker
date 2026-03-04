# Settings & Paywall Screen — Claude Code Prompts

Feed these to CC one at a time, in order. Check off each one as you go.

---

## Settings Screen

### Prompt 1: Reorder Settings sections

- [x] **Done**

> Reorder the Settings screen sections in this exact order from top to bottom: 1) My Symptoms, 2) Reminder, 3) Subscription (rename the "Premium" section header to "Subscription"), 4) Export, 5) About. Move the About section (Ebb, v1.0.0, tagline) to the very bottom of the screen. Remove the Account/Sign In section entirely for now — we'll add auth later.

---

### Prompt 2: Rebuild the Subscription section

- [ ] **Done**

> Replace the current Premium card in the Settings screen with a Subscription section containing three standard iOS-height rows (44-52px each). Row 1: "Current Plan" — displays a "Free" badge on the right side (or "Premium ✓" badge if the user is subscribed). Row 2: "Upgrade to Premium" — with a right chevron. Tapping this row should navigate to a new PaywallScreen (we'll build that screen next). Row 3: "Restore Purchase" — standard tappable row with a right chevron. This should be a full-height row, NOT the tiny text link it is currently. Remove the old Ebb Premium promotional card and the small "Restore purchase" text link entirely.

---

### Prompt 3: Fix My Symptoms row sizing

- [ ] **Done**

> In the Settings screen My Symptoms section, reduce the row padding so each row uses standard iOS row height (44-52px). The symptom icons should be 22px inside a 34px container, and each icon should use its symptom-specific color from the symptomColors map (not all the same color). Don't change anything else about this section — the delete buttons and add symptom input are fine.

---

### Prompt 4: Reduce Export section whitespace

- [ ] **Done**

> In the Settings screen Export section, reduce the vertical padding above and below the section. There's too much whitespace around the Export CSV and Export PDF rows currently. Match the padding density of the other sections.

---

### Prompt 5: Add links to About section

- [ ] **Done**

> In the About section at the bottom of the Settings screen, add two tappable links below the app name/version/tagline: "Privacy Policy" and "Terms of Use". These should open URLs in the system browser. Use placeholder URLs for now (https://example.com/privacy and https://example.com/terms) — we'll update them before launch. Style them as standard iOS link text.

---

## Paywall Screen

### Prompt 6: Create the PaywallScreen layout

- [ ] **Done**

> Create a new PaywallScreen component that opens as a full-screen modal when the user taps "Upgrade to Premium" in Settings. Layout from top to bottom: a close/back button in the top left corner, the Ebb app icon or a simple brand illustration centered at top, "Ebb Premium" as the headline, a feature list with icons showing these four benefits: "Unlimited symptom tracking" (beyond the free 5 limit), "Unlimited history", "PDF export for doctor appointments", "Trend analysis" (30-day, 90-day, and all-time views). Below the feature list: two pricing cards side by side — Monthly ($X.XX/month) on the left and Annual ($XX.XX/year) on the right. The annual card should have a "Save X%" badge and be visually highlighted as the recommended option (slightly larger, border highlight, or background color). Below the cards: a "Start Free Trial" primary CTA button — solid coral #E8725A background, white text, full width, 56px height, borderRadius 18. At the very bottom: small gray text links for "Terms · Privacy · Restore" separated by dots. Use placeholder prices for now — we'll connect to RevenueCat next. Match the warm design language of the rest of the app.

---

### Prompt 7: Wire up RevenueCat to the PaywallScreen

- [ ] **Done**

> Connect the PaywallScreen to RevenueCat. The monthly and annual prices displayed on the pricing cards should pull dynamically from RevenueCat offerings — do not hardcode prices. When the user selects a plan and taps "Start Free Trial", trigger the RevenueCat purchase flow for the selected offering. The "Restore" link at the bottom should call RevenueCat's restorePurchases method. After a successful purchase or restore, update the subscription state and navigate back to Settings where the "Current Plan" row should now show "Premium ✓". Handle loading states and error cases gracefully — show a spinner during purchase and an alert if something fails.

---

## After all prompts are done

- [ ] Take fresh screenshots of the completed Settings screen and Paywall screen
- [ ] Save to `design/latestScreensScreenshots/`
- [ ] Review for any visual issues and file one-off fix prompts if needed
- [ ] Move on to App Store submission prep
