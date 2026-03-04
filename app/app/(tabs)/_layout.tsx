import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { enableFreeze } from 'react-native-screens';
import { colors } from '../../src/theme';
import BottomNav from '../../src/components/BottomNav';

enableFreeze(true);

/**
 * ErrorBoundary that catches NativeTabs crashes and falls back to JS tabs.
 */
class NativeTabsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[NativeTabs] Fell back to JS tabs:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackTabs />;
    }
    return this.props.children;
  }
}

function FallbackTabs() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="trends" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

function NativeTabsLayout() {
  return (
    <NativeTabs
      disableTransparentOnScrollEdge={true}
      blurEffect="systemThickMaterialLight"
      backgroundColor="#FDF8F5"
      screenOptions={{ freezeOnBlur: true }}
      tintColor={colors.primary}
      iconColor={{
        default: '#7A706B',
        selected: colors.primary,
      }}
      labelStyle={{
        default: { color: '#7A706B' },
        selected: { color: colors.primary },
      }}
    >
      <NativeTabs.Trigger name="home" disableTransparentOnScrollEdge>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <Label>History</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trends">
        <Icon sf={{ default: 'chart.xyaxis.line', selected: 'chart.xyaxis.line' }} />
        <Label>Trends</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'slider.horizontal.3', selected: 'slider.horizontal.3' }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  if (Platform.OS !== 'ios') {
    return <FallbackTabs />;
  }

  return (
    <NativeTabsErrorBoundary>
      <NativeTabsLayout />
    </NativeTabsErrorBoundary>
  );
}
