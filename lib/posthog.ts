import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

export const posthog = new PostHog(apiKey, {
  host,
  // Enable capture of screen views
  captureApplicationLifecycleEvents: true,
  // Capture native touches
  captureTouches: true,
});

// Helper functions for common events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties);
};

export const trackScreenView = (screenName: string, properties?: Record<string, any>) => {
  posthog.screen(screenName, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

export const resetUser = () => {
  posthog.reset();
};
