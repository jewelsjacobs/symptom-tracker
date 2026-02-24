import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '../theme';
import { loadSettings } from '../storage';
import BottomNav from '../components/BottomNav';

import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import HistoryScreen from '../screens/HistoryScreen';
import TrendsScreen from '../screens/TrendsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// --- App Context (for onboarding completion signal) ---

type AppContextType = {
  completeOnboarding: () => void;
};

const AppContext = createContext<AppContextType>({
  completeOnboarding: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

// --- Param Lists ---

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

// --- Navigators ---

const RootStack = createStackNavigator<RootStackParamList>();
const HomeStackNav = createStackNavigator<HomeStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="Home" component={HomeScreen} />
      <HomeStackNav.Screen name="DailyLog" component={DailyLogScreen} />
    </HomeStackNav.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainTab.Screen name="HomeStack" component={HomeStackNavigator} />
      <MainTab.Screen name="History" component={HistoryScreen} />
      <MainTab.Screen name="Trends" component={TrendsScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
}

// --- Root Navigator ---

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
