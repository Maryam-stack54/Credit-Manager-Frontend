
import { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isUnlocked, setPendingRoute } from '../services/appLock';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { AppThemeProvider, useAppTheme } from '../context/ThemeContext';

// Show reminders as a banner with sound even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Sets up every screen and applies the light or dark theme to headers and tabs
function RootNavigator() {
  const { colors, isDark } = useAppTheme();

  // Headers and the tab bar take their colours from the navigation theme
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.divider,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          // Headers blend into the page instead of sitting in a grey bar
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerTintColor: colors.text,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="auth/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="auth/welcome"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="auth/login"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="auth/register"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="customers/[id]"
          options={{ headerShown: true, title: 'Customer' }}
        />

        <Stack.Screen
          name="credits/[id]"
          options={{ headerShown: true, title: 'Credit Details' }}
        />

        <Stack.Screen
          name="more/edit-profile"
          options={{ headerShown: true, title: 'Edit Profile' }}
        />

        <Stack.Screen
          name="more/change-password"
          options={{ headerShown: true, title: 'Change Password' }}
        />

        <Stack.Screen
          name="more/appearance"
          options={{ headerShown: true, title: 'Appearance' }}
        />

        <Stack.Screen
          name="more/reminders"
          options={{ headerShown: true, title: 'Payment Reminders' }}
        />

        <Stack.Screen
          name="more/help"
          options={{ headerShown: true, title: 'Help & About' }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

// Entry point of the app: wraps everything in the theme provider
export default function RootLayout() {
  useEffect(() => {
    // Ask for permission to show payment reminders
    async function requestNotificationPermission() {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } =
          await Notifications.requestPermissionsAsync();

        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission was not granted.');
        return;
      }

      console.log('Notification permission granted.');
    }

    requestNotificationPermission();

    // Tapping a payment reminder opens that credit. If the user has not
    // logged in yet, the credit opens right after they do.
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.type === 'credit-reminder' && data.creditId) {
          const route = `/credits/${data.creditId}`;

          if (isUnlocked()) {
            router.push(route);
          } else {
            setPendingRoute(route);
          }
        }
      });

    return () => subscription.remove();
  }, []);

  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}
