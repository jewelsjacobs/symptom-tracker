# Coding Spec: RevenueCat + Freemium Gates
**Agent Board IDs:** task_ddb84dcac3db6802 (RevenueCat), task_37b833173101f86d (Freemium gates)  
**Priority:** High — monetization foundation  
**Assigned to:** Claude Code  
**Depends on:** Nothing (can be done in parallel with Supabase)

---

## Overview

Integrate RevenueCat for iOS in-app subscriptions, expose a `usePremium()` hook, and gate the three premium features:
1. Symptoms beyond 5 (currently limits enforced manually — wire to subscription)
2. History beyond 30 days
3. PDF export button (phase 3 — gate the UI)

---

## Before Starting

Julia needs to do these manually in App Store Connect + RevenueCat dashboard first:
- Create app in App Store Connect (bundle ID: `com.julia.ebb`)
- Create two IAP products:
  - `com.julia.ebb.premium.monthly` — Auto-Renewable Subscription, $2.99/month
  - `com.julia.ebb.premium.yearly` — Auto-Renewable Subscription, $14.99/year
  - Optional: add 14-day free trial to both
- Create RevenueCat account at revenuecat.com, create project, add iOS app
- Copy the RevenueCat **iOS public API key** (looks like `appl_xxxx...`)
- Create an Entitlement named `premium`, attach both products to it
- Create an Offering named `default`, add a Package with both products

---

## Step 1 — Install

```bash
cd ~/projects/symptom-tracker/app
npx expo install react-native-purchases react-native-purchases-ui
```

Add to `app.json` plugins:
```json
["react-native-purchases"]
```

**Requires a new dev build** after this change.

---

## Step 2 — Files to Create

### `app/src/purchases/index.ts` (new file)

```ts
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY'; // Replace with real key
const PREMIUM_ENTITLEMENT_ID = 'premium';

export function configurePurchases() {
  if (Platform.OS === 'ios') {
    Purchases.setLogLevel(LOG_LEVEL.WARN); // Change to DEBUG during development
    Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
  }
}

/**
 * Check if the current user has an active premium entitlement.
 */
export async function isPremium(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Get the current offering packages (monthly + yearly).
 * Returns null if offerings can't be fetched.
 */
export async function getOfferings(): Promise<PurchasesPackage[] | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current.availablePackages;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Purchase a package. Returns true on success, false on cancellation/error.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
  } catch (e: any) {
    if (e.userCancelled) return false;
    throw e; // let caller handle unexpected errors
  }
}

/**
 * Restore previous purchases (required by App Store guidelines).
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
  } catch {
    return false;
  }
}
```

### `app/src/purchases/usePremium.ts` (new file)

```ts
import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isPremium } from './index';

/**
 * React hook: returns { premium, loading, refresh }
 * Re-checks whenever app comes to foreground (handles subscription changes).
 */
export function usePremium() {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPremium(await isPremium());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => sub.remove();
  }, [refresh]);

  return { premium, loading, refresh };
}
```

---

## Step 3 — Files to Modify

### `app/App.tsx`

Import and call `configurePurchases` at app startup:

```ts
import { configurePurchases } from './src/purchases';

// Add to the top of App() component:
useEffect(() => {
  configurePurchases();
}, []);
```

### `app/src/screens/SettingsScreen.tsx`

Add a **Premium** section above Account. This is where users manage their subscription.

```tsx
import { usePremium } from '../purchases/usePremium';
import { getOfferings, purchasePackage, restorePurchases } from '../purchases';
import { PurchasesPackage } from 'react-native-purchases';

// Inside SettingsScreen component:
const { premium, loading: premiumLoading, refresh: refreshPremium } = usePremium();

// New section above Account:
<Text style={styles.sectionTitle}>Premium</Text>
<View style={styles.card}>
  {premiumLoading ? (
    <ActivityIndicator color={colors.primary} />
  ) : premium ? (
    <>
      <Text style={styles.premiumActive}>✨ Premium Active</Text>
      <Text style={styles.hint}>Unlimited symptoms, full history, PDF export</Text>
    </>
  ) : (
    <UpgradePrompt onSuccess={refreshPremium} />
  )}
  <TouchableOpacity
    style={styles.restoreBtn}
    onPress={async () => {
      const restored = await restorePurchases();
      if (restored) {
        refreshPremium();
        Alert.alert('Restored!', 'Your Premium subscription has been restored.');
      } else {
        Alert.alert('Nothing to restore', 'No previous Premium purchase found.');
      }
    }}
  >
    <Text style={styles.restoreBtnText}>Restore purchase</Text>
  </TouchableOpacity>
</View>
```

Create `app/src/components/UpgradePrompt.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage } from '../purchases';
import { colors, spacing, fontSize, radius } from '../theme';

type Props = { onSuccess: () => void };

export default function UpgradePrompt({ onSuccess }: Props) {
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOfferings().then(setPackages);
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    setLoading(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        onSuccess();
        Alert.alert('Welcome to Premium! ✨', 'Unlimited symptoms, full history, and PDF export are now unlocked.');
      }
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!packages) return <ActivityIndicator color={colors.primary} />;

  return (
    <View>
      <Text style={styles.headline}>Unlock Ebb Premium</Text>
      <Text style={styles.features}>
        ✓ Unlimited symptoms{'\n'}
        ✓ Full history (beyond 30 days){'\n'}
        ✓ Doctor-ready PDF export{'\n'}
        ✓ All-time trends charts
      </Text>
      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          style={styles.pkgBtn}
          onPress={() => handlePurchase(pkg)}
          disabled={loading}
        >
          <Text style={styles.pkgLabel}>{pkg.product.title}</Text>
          <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
        </TouchableOpacity>
      ))}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  features: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  pkgBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pkgLabel: { color: '#fff', fontWeight: '600', fontSize: fontSize.md },
  pkgPrice: { color: '#fff', fontSize: fontSize.md },
});
```

---

## Step 4 — Freemium Gate: Symptom Limit

### `app/src/screens/SettingsScreen.tsx` + `OnboardingScreen.tsx`

Replace hardcoded `MAX_FREE_SYMPTOMS = 5` gates with premium-aware logic:

```ts
const MAX_FREE_SYMPTOMS = 5;
const MAX_PREMIUM_SYMPTOMS = 20;

// In addSymptom():
const limit = premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS;
if (settings.symptoms.length >= limit) {
  if (!premium) {
    // Show paywall
    navigation.navigate('Paywall'); // or show UpgradePrompt in a modal
  }
  return;
}
```

The paywall can be a `Modal` wrapping `UpgradePrompt` — no new screen needed for MVP.

---

## Step 5 — Freemium Gate: History Beyond 30 Days

### `app/src/screens/HistoryScreen.tsx`

After loading logs, filter to 30 days for free users:

```ts
const HISTORY_FREE_DAYS = 30;

// After loadAllLogs():
const filtered = premium
  ? logs
  : logs.filter((log) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - HISTORY_FREE_DAYS);
      return new Date(log.date) >= cutoff;
    });
setLogs(filtered);
```

If a free user has fewer than 30 days of data, no difference. If they have more, older entries are hidden.

Add a "Unlock full history" banner at the bottom of the list for free users with > 0 filtered entries.

---

## Step 6 — Freemium Gate: Trends Time Range

### `app/src/screens/TrendsScreen.tsx`

Current implementation is hardcoded 7 days. Phase-2 enhancement will add 30/90/all-time toggle — gate the non-7-day options behind premium at that point. No change needed now.

---

## Testing

- Test in sandbox: RevenueCat's sandbox mode works with StoreKit sandbox accounts (Xcode → Manage Schemes → Diagnostics or AppStore Connect sandbox testers)
- `Purchases.setLogLevel(LOG_LEVEL.DEBUG)` during testing shows detailed purchase flow in console
- Test "restore purchases" — required by App Store review guidelines

---

## Required by App Store Guidelines

- "Restore Purchases" button must be visible on the paywall/settings screen ✅ (included above)
- Subscription terms must be visible before purchase (RevenueCat's package `product.description` covers this)
- Privacy policy must mention subscription data (update privacy policy doc accordingly)
