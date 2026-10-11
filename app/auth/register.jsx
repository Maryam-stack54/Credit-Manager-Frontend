import { API_URL } from '../../constants/api';

import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '../../context/ThemeContext';
import AuthHeader from '../../components/AuthHeader';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import MessageBanner from '../../components/MessageBanner';

// Create a new account
export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // What the user has typed
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Messages under the form and the loading state of the button
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sends the new account details to the backend, then opens the login screen
  const handleRegister = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_URL}/api/users/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
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

      setName('');
      setUsername('');
      setPassword('');

      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500);
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    }
  };

  // Shows a loading spinner while saving and stops double taps
  const onSubmit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    await handleRegister();
    setSubmitting(false);
  };

  return (
    <KeyboardScreen>
      {/* Green header with the back button and title */}
      <AuthHeader
        title="Create your account"
        subtitle="Start tracking credit in under a minute."
      />

      {/* White sheet holding the form, sliding up when the screen opens */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(500)}
        style={styles.sheet}
      >
        {/* Full name */}
        <FormField
          label="Full name"
          icon="person-outline"
          placeholder="e.g. Maryam Musa"
          autoCapitalize="words"
          returnKeyType="next"
          value={name}
          onChangeText={setName}
        />

        {/* Username, with the rules shown underneath */}
        <FormField
          label="Username"
          icon="at-outline"
          placeholder="e.g. maryam_store"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          hint="3 to 20 characters: letters, numbers, _ or ."
          value={username}
          onChangeText={setUsername}
        />

        {/* Password, at least 6 characters, with a show/hide button */}
        <FormField
          label="Password"
          icon="lock-closed-outline"
          placeholder="Create a password"
          secure
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          hint="At least 6 characters"
          value={password}
          onChangeText={setPassword}
        />

        {/* Success or error message from the backend */}
        <MessageBanner type="success" message={successMessage} />
        <MessageBanner type="error" message={errorMessage} />

        {/* Create account button, shows a spinner while waiting */}
        <AppButton
          title="Create account"
          iconRight="arrow-forward"
          loading={submitting}
          onPress={onSubmit}
          style={styles.button}
        />

        {/* Link to the login screen */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            onPress={() => router.replace('/auth/login')}
            hitSlop={8}
          >
            <Text style={styles.footerLink}>Log in</Text>
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
