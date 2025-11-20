import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long before data is considered stale (5 minutes)
      staleTime: 1000 * 60 * 5,
      // Cache time: how long inactive data stays in cache (10 minutes)
      gcTime: 1000 * 60 * 10,
      // Retry failed requests
      retry: 2,
      // Refetch on window focus (when app comes to foreground)
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Network mode: online by default, but allow offline queries
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Optional: Set up network status listener for better offline support
NetInfo.addEventListener((state) => {
  const isOnline = state.isConnected && state.isInternetReachable;

  if (isOnline) {
    // Refetch queries when coming back online
    queryClient.refetchQueries({ type: 'active' });
  }
});
