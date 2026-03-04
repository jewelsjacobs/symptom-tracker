import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Force an opaque background on every screen in this stack.
        // This prevents iOS from seeing a transparent layer during the
        // pop transition and incorrectly triggering scroll-edge
        // transparency on the native tab bar.
        contentStyle: { backgroundColor: '#E8725A' },
      }}
    />
  );
}
