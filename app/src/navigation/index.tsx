import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '../theme';
import { loadSettings } from '../storage';

import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import HistoryScreen from '../screens/HistoryScreen';
import TrendsScreen from '../screens/TrendsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ─── App Context (for onboarding completion signal) ───────────────────────────

type AppContextType = {
  completeOnboarding: () => void;
};

const AppContext = createContext<AppContextType>({
  completeOnboarding: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

// ─── Param Lists ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  DailyLog: undefined;
};

export type MainTabParamList = {
  HomeStack: undefined;
  History: undefined;
  Trends: undefined;
  Settings: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────

const RootStack = createStackNavigator<RootStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="DailyLog" component={DailyLogScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <MainTab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ tabBarLabel: '🏠 Home' }}
      />
      <MainTab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: '📅 History' }}
      />
      <MainTab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{ tabBarLabel: '📈 Trends' }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '⚙️ Settings' }}
      />
    </MainTab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

/**
 * RootNavigator checks onboarding state on mount and routes accordingly.
 * Uses a context so OnboardingScreen can signal completion without prop drilling.
 */
export function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main'>('Onboarding');


  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      setInitialRoute(settings.hasCompletedOnboarding ? 'Main' : 'Onboarding');
      setIsLoading(false);
    })();
  }, []);

  // Called by OnboardingScreen when user taps "Start Tracking"
  function completeOnboarding() {
    setInitialRoute('Main');
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ completeOnboarding }}>
      <RootStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'none' }}
      >
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      </RootStack.Navigator>
    </AppContext.Provider>
  );
}
