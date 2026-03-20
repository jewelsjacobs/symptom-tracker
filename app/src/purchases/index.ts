import Purchases, { LOG_LEVEL, PurchasesPackage, STOREKIT_VERSION } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '';
const PREMIUM_ENTITLEMENT_ID = 'premium';

export function configurePurchases() {
  if (Platform.OS === 'ios') {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS, storeKitVersion: STOREKIT_VERSION.STOREKIT_2 });
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
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'userCancelled' in e && (e as { userCancelled: boolean }).userCancelled) return false;
    throw e;
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
