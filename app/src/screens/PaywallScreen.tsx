import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';

import { colors, spacing, radius } from '../theme';
import { getOfferings, purchasePackage, restorePurchases } from '../purchases';
import { usePremium } from '../purchases/usePremium';
import CreamBackground from '../components/CreamBackground';
import GlassCard from '../components/GlassCard';
import EbbText from '../components/EbbText';
import CoralButton from '../components/CoralButton';

type Plan = 'monthly' | 'annual';

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10.5L8 14.5L16 6.5"
        stroke={colors.primary}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 4L12 12M12 4L4 12"
        stroke={colors.text}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const FEATURES = [
  'Unlimited symptom tracking',
  'Unlimited history',
  'PDF export for doctor visits',
  'Trend analysis (Month, 3 Months, All)',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { refresh: refreshPremium } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      const packages = await getOfferings();
      if (packages) {
        for (const pkg of packages) {
          if (pkg.packageType === PACKAGE_TYPE.MONTHLY) setMonthlyPkg(pkg);
          if (pkg.packageType === PACKAGE_TYPE.ANNUAL) setAnnualPkg(pkg);
        }
      }
      setLoadingOfferings(false);
    })();
  }, []);

  const selectedPkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

  const handleSubscribe = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        await refreshPremium();
        router.back();
      }
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        await refreshPremium();
        Alert.alert('Restored!', 'Your Premium subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No previous Premium purchase found.');
      }
    } catch {
      Alert.alert('Restore failed', 'Something went wrong. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const monthlyPrice = monthlyPkg?.product.priceString ?? '—';
  const annualPrice = annualPkg?.product.priceString ?? '—';

  // Compute savings percentage if both prices are available
  let savingsLabel: string | null = null;
  if (monthlyPkg && annualPkg) {
    const monthlyCost = monthlyPkg.product.price * 12;
    const annualCost = annualPkg.product.price;
    if (monthlyCost > 0) {
      const pct = Math.round(((monthlyCost - annualCost) / monthlyCost) * 100);
      if (pct > 0) savingsLabel = `Save ${pct}%`;
    }
  }

  // Pull intro offer trial period from RevenueCat if available
  const introOffer = selectedPkg?.product.introPrice;
  const trialLabel: string | null = introOffer
    ? `${introOffer.periodNumberOfUnits}-${introOffer.periodUnit.toLowerCase()} free trial`
    : '7-day free trial';

  const busy = purchasing || restoring;

  return (
    <CreamBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={12}
          disabled={busy}
        >
          <CloseIcon />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* App icon */}
          <Image
            source={require('../../assets/icon.png')}
            style={styles.appIcon}
          />

          {/* Headline */}
          <EbbText type="largeTitle" style={styles.headline}>
            Ebb Premium
          </EbbText>

          {/* Subtitle */}
          <EbbText type="body" style={styles.subtitle}>
            Track without limits. Understand your patterns.
          </EbbText>

          {/* Free trial callout */}
          <View style={styles.trialBanner}>
            <EbbText type="subheadline" style={styles.trialBannerText}>
              ✦ {trialLabel} — then cancel anytime
            </EbbText>
          </View>

          {/* Feature list */}
          <GlassCard variant="cream" style={styles.featureCard}>
            {FEATURES.map((feature, i) => (
              <View
                key={feature}
                style={[
                  styles.featureRow,
                  i < FEATURES.length - 1 && styles.featureRowBorder,
                ]}
              >
                <CheckIcon />
                <EbbText type="body" style={styles.featureText}>
                  {feature}
                </EbbText>
              </View>
            ))}
          </GlassCard>

          {/* Pricing cards */}
          {loadingOfferings ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.offeringsLoader}
            />
          ) : (
            <View style={styles.pricingRow}>
              {/* Monthly */}
              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                style={styles.pricingPressable}
                disabled={busy}
              >
                <GlassCard
                  variant="cream"
                  style={selectedPlan === 'monthly' ? styles.pricingCardSelected : undefined}
                >
                  <View style={styles.pricingCardInner}>
                    <EbbText type="headline" style={styles.pricingLabel}>
                      Monthly
                    </EbbText>
                    <EbbText type="largeTitle" style={styles.pricingPrice}>
                      {monthlyPrice}
                    </EbbText>
                    <EbbText type="footnote" style={styles.pricingPeriod}>
                      per month
                    </EbbText>
                  </View>
                </GlassCard>
              </Pressable>

              {/* Annual */}
              <Pressable
                onPress={() => setSelectedPlan('annual')}
                style={styles.pricingPressable}
                disabled={busy}
              >
                <GlassCard
                  variant="cream"
                  style={selectedPlan === 'annual' ? styles.pricingCardSelected : undefined}
                >
                  <View style={styles.pricingCardInner}>
                    <EbbText type="headline" style={styles.pricingLabel}>
                      Annual
                    </EbbText>
                    <EbbText type="largeTitle" style={styles.pricingPrice}>
                      {annualPrice}
                    </EbbText>
                    <EbbText type="footnote" style={styles.pricingPeriod}>
                      per year
                    </EbbText>
                  </View>
                </GlassCard>
                {/* Save badge — outside GlassCard to avoid BlurView overflow clip */}
                {savingsLabel && (
                  <View style={styles.saveBadge}>
                    <EbbText type="caption" style={styles.saveBadgeText}>
                      {savingsLabel}
                    </EbbText>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* CTA */}
          <CoralButton
            label="Start Free Trial"
            onPress={handleSubscribe}
            loading={purchasing}
            disabled={busy || !selectedPkg}
            style={styles.cta}
          />

          {/* Footer links */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => Linking.openURL('https://ebb.bio/terms')}
              disabled={busy}
            >
              <EbbText type="footnote" style={styles.footerLink}>
                Terms
              </EbbText>
            </Pressable>
            <EbbText type="footnote" style={styles.footerDot}>
              ·
            </EbbText>
            <Pressable
              onPress={() => Linking.openURL('https://ebb.bio/privacy')}
              disabled={busy}
            >
              <EbbText type="footnote" style={styles.footerLink}>
                Privacy
              </EbbText>
            </Pressable>
            <EbbText type="footnote" style={styles.footerDot}>
              ·
            </EbbText>
            <Pressable onPress={handleRestore} disabled={busy}>
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <EbbText type="footnote" style={styles.footerLink}>
                  Restore
                </EbbText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </CreamBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + 20,
    alignItems: 'center',
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: spacing.md,
  },
  headline: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  trialBanner: {
    backgroundColor: colors.primary + '1A', // 10% opacity coral
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  trialBannerText: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  featureCard: {
    width: '100%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  featureText: {
    color: colors.text,
    flex: 1,
  },
  offeringsLoader: {
    marginVertical: spacing.xl,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pricingPressable: {
    flex: 1,
  },
  pricingCardInner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  pricingCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pricingLabel: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pricingPrice: {
    color: colors.text,
    marginBottom: 2,
  },
  pricingPeriod: {
    color: colors.textMuted,
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    zIndex: 10,
  },
  saveBadgeText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  cta: {
    width: '100%',
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerLink: {
    color: colors.textMuted,
  },
  footerDot: {
    color: colors.textMuted,
  },
});
