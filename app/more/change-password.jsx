import { API_URL } from '../../constants/api';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import MessageBanner from '../../components/MessageBanner';

// Change the account password
export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The three password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Checks the new password locally, then asks the backend to change it
  const handleChangePassword = async () => {
    setErrorMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    // Same rule as the backend: at least 6 characters
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    // Both new password fields must match
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from the current one.');
      return;
    }

    setSaving(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await authFetch(`${API_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Could not change password.');
        return;
      }

      Alert.alert('Password changed', data.message, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  // Live feedback under the confirm field
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDiffer =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <KeyboardScreen withHeader contentContainerStyle={styles.content}>
      {/* Short explanation at the top */}
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
        </View>
        <Text style={styles.introText}>
          Choose a password you have not used before. You will use it the
          next time you log in.
        </Text>
      </View>

      {/* Current, new and confirm password fields, each with show/hide */}
      <View style={styles.card}>
        <FormField
          label="Current password"
          icon="lock-closed-outline"
          placeholder="Current password"
          secure
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <FormField
          label="New password"
          icon="key-outline"
          placeholder="At least 6 characters"
          secure
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <FormField
          label="Confirm new password"
          icon="key-outline"
          placeholder="Type the new password again"
          secure
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.lastField}
        />

        {passwordsMatch || passwordsDiffer ? (
          <View style={styles.matchRow}>
            <Ionicons
              name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={passwordsMatch ? colors.successText : colors.danger}
            />
            <Text
              style={[
                styles.matchText,
                { color: passwordsMatch ? colors.successText : colors.danger },
              ]}
            >
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Error message from the checks or the backend */}
      <MessageBanner type="error" message={errorMessage} />

      {/* Change password button, shows a spinner while saving */}
      <AppButton
        title="Change password"
        icon="checkmark"
        loading={saving}
        onPress={() => {
          Keyboard.dismiss();
          handleChangePassword();
        }}
      />
    </KeyboardScreen>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  lastField: {
    marginBottom: 0,
  },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 2,
  },

  matchText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
