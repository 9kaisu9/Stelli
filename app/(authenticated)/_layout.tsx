import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Colors } from '@/constants/styleGuide';

/**
 * Protected Route Layout
 *
 * This layout wraps all authenticated routes in the /(authenticated) group.
 * It checks authentication status and redirects to login if not authenticated.
 *
 * How it works:
 * 1. useAuth() hook provides current auth state
 * 2. While loading initial auth state, show spinner
 * 3. If not authenticated, redirect to login (/)
 * 4. If authenticated, render child routes via <Slot />
 */
export default function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Check if we're in an authenticated route
    const inAuthGroup = segments[0] === '(authenticated)';

    // If not authenticated and trying to access authenticated route, redirect to login
    if (!user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryActive} />
      </View>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  // User is authenticated, render child routes with Stack navigation
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen
        name="create-list"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
