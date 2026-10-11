import { API_URL } from '../../constants/api';
import { useEffect, useState, useMemo } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '../../context/ThemeContext';
import AuthHeader from '../../components/AuthHeader';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import MessageBanner from '../../components/MessageBanner';
import {
  confirmWithDevice,
  getDeviceUnlockMethod,
  isQuickLoginEnabled,
  setUnlocked,
  takePendingRoute,
} from '../../services/appLock';

// Button text and icon for each way a phone can confirm its owner
const QUICK_LOGIN = {
  fingerprint: { title: 'Log in with fingerprint', icon: 'finger-print' },
  face: { title: 'Log in with face', icon: 'scan-outline' },
  iris: { title: 'Log in with iris', icon: 'eye-outline' },
  device: {
    title:
      Platform.OS === 'ios'
        ? 'Log in with phone passcode'
        : 'Log in with phone PIN',
    icon: 'keypad-outline',
  },
};

// Opens Home, then the credit from a tapped reminder if there was one
const goToApp = () => {
  setUnlocked(true);
  router.replace('/(tabs)/dashboard');

  const pending = takePendingRoute();
  if (pending) {
    setTimeout(() => router.push(pending), 300);
  }
};

// Log in with username and password, or with fingerprint after a previous login
export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // What the user has typed
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Messages under the form and the loading state of the Log in button
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fingerprint / face option, shown only to someone who has logged in on
  // this phone before and has not logged out since
  const [quickLogin, setQuickLogin] = useState(null);

  // Decide whether to show the fingerprint button when the screen opens
  useEffect(() => {
    const checkQuickLogin = async () => {
      const token = await SecureStore.getItemAsync('token');
      const enabled = await isQuickLoginEnabled();
      const method = await getDeviceUnlockMethod();

      if (!token || !enabled || method === 'none') return;

      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // A 401 means the saved login is no longer valid
        if (response.status === 401) {
          // The saved login has expired, so a normal login is needed
          await SecureStore.deleteItemAsync('token');
          return;
        }

        const data = response.ok ? await response.json() : null;
        const firstName = (data?.user?.name || '').trim().split(/\s+/)[0];

        setQuickLogin({ ...QUICK_LOGIN[method], firstName });
      } catch (error) {
        // Offline: still offer it. Screens show their own connection errors.
        setQuickLogin({ ...QUICK_LOGIN[method], firstName: '' });
      }
    };

    checkQuickLogin();
  }, []);

  // Asks the phone to confirm the owner, then reuses the saved login
  const handleQuickLogin = async () => {
    setErrorMessage('');

    if (await confirmWithDevice()) {
      goToApp();
    }
  };

  // Sends the username and password to the backend
  const handleLogin = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_URL}/api/users/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message);
        return;
      }

      setSuccessMessage(data.message);

      // Keep the login token in the phone's encrypted storage
      await SecureStore.setItemAsync('token', data.token);

      setTimeout(goToApp, 1000);
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    }
  };

  // Shows a loading spinner while logging in and stops double taps
  const onSubmit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    await handleLogin();
    setSubmitting(false);
  };

  return (
    <KeyboardScreen>
      {/* Green header with the back button and title */}
      <AuthHeader
        title="Welcome back"
        subtitle="Log in to see who owes you today."
      />

      {/* White sheet holding the form, sliding up when the screen opens */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(500)}
        style={styles.sheet}
      >
        {/* Username field */}
        <FormField
          label="Username"
          icon="person-outline"
          placeholder="Your username"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          value={username}
          onChangeText={setUsername}
        />

        {/* Password field with a show/hide button */}
        <FormField
          label="Password"
          icon="lock-closed-outline"
          placeholder="Your password"
          secure
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          value={password}
          onChangeText={setPassword}
        />

        {/* Success or error message from the backend */}
        <MessageBanner type="success" message={successMessage} />
        <MessageBanner type="error" message={errorMessage} />

        {/* Log in button, shows a spinner while waiting */}
        <AppButton
          title="Log in"
          iconRight="arrow-forward"
          loading={submitting}
          onPress={onSubmit}
          style={styles.button}
        />

        {quickLogin ? (
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Fingerprint login, only shown after a previous login on this phone */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <AppButton
              title={quickLogin.title}
              icon={quickLogin.icon}
              variant="secondary"
              onPress={handleQuickLogin}
            />

            {quickLogin.firstName ? (
              <Text style={styles.quickHint}>
                Continue as {quickLogin.firstName}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Link to the sign-up screen */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Credit Manager? </Text>
          <Pressable
            onPress={() => router.replace('/auth/register')}
            hitSlop={8}
          >
            <Text style={styles.footerLink}>Create an account</Text>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardScreen>
  );
}

const createStyles = (colors) => StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 32,
  },

  button: {
    marginTop: 8,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 12,
  },

  quickHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 26,
  },

  footerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
