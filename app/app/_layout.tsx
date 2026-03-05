import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, Redirect, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { colors } from '../src/theme';
import { loadSettings } from '../src/storage';
import { AppContext } from '../src/context/AppContext';
import { configurePurchases } from '../src/purchases';
import { PremiumProvider } from '../src/purchases/usePremium';

// Keep splash visible until settings load
SplashScreen.preventAutoHideAsync();

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    configurePurchases();

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    (async () => {
      try {
        const settings = await loadSettings();
        setHasOnboarded(settings.hasCompletedOnboarding);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  function completeOnboarding() {
    setHasOnboarded(true);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={{ completeOnboarding }}>
          <PremiumProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
              <Stack.Screen name="index" redirect />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            {isReady && !hasOnboarded && <Redirect href="/onboarding" />}
            <StatusBar style="auto" />
          </PremiumProvider>
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
