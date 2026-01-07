import { Stack } from 'expo-router';
import { useFonts, Muli_400Regular, Muli_700Bold } from '@expo-google-fonts/muli';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '@/lib/posthog';

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Muli_400Regular,
    Muli_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}

