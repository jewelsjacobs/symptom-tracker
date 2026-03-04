import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage } from '../purchases';
import { colors, spacing, radius } from '../theme';
import EbbText from './EbbText';

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
        Alert.alert('Welcome to Premium!', 'Unlimited symptoms, full history, and PDF export are now unlocked.');
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
      <EbbText type="headline" style={styles.headline}>Unlock Ebb Premium</EbbText>
      <EbbText type="subhead" style={styles.features}>
        {'\u2713'} Unlimited symptoms{'\n'}
        {'\u2713'} Full history (beyond 30 days){'\n'}
        {'\u2713'} Doctor-ready PDF export{'\n'}
        {'\u2713'} All-time trends charts
      </EbbText>
      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          style={styles.pkgBtn}
          onPress={() => handlePurchase(pkg)}
          disabled={loading}
        >
          <EbbText type="headline" style={styles.pkgLabel}>{pkg.product.title}</EbbText>
          <EbbText type="body" style={styles.pkgPrice}>{pkg.product.priceString}</EbbText>
        </TouchableOpacity>
      ))}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.text, marginBottom: spacing.xs },
  features: { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  pkgBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pkgLabel: { color: '#fff' },
  pkgPrice: { color: '#fff' },
});
