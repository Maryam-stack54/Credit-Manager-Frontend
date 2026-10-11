import { API_URL } from '../../constants/api';
import { useEffect, useState, useMemo } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import Avatar from '../../components/Avatar';
import MessageBanner from '../../components/MessageBanner';

// Edit the owner's name and business details
export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Profile fields being edited
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load the current profile into the form when the screen opens
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');

        const response = await authFetch(`${API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || 'Could not load profile.');
          return;
        }

        setName(data.user.name);
        setUsername(data.user.username);
        setBusinessName(data.user.businessName);
        setBusinessPhone(data.user.businessPhone);
        setBusinessAddress(data.user.businessAddress);
      } catch (error) {
        setErrorMessage('Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Checks the name and saves the profile
  const handleSave = async () => {
    setErrorMessage('');

    // Same rule as the backend: the name must be at least 2 characters
    if (name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    setSaving(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await authFetch(`${API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          businessPhone: businessPhone.trim(),
          businessAddress: businessAddress.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Could not update profile.');
        return;
      }

      Alert.alert('Saved', data.message, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardScreen withHeader contentContainerStyle={styles.content}>
      {/* Initials and username at the top */}
      <View style={styles.avatarWrap}>
        <Avatar name={name} size={84} />
        <Text style={styles.username}>@{username}</Text>
      </View>

      {/* Name, and the username which cannot be changed */}
      <Text style={styles.sectionTitle}>PERSONAL</Text>
      <View style={styles.card}>
        <FormField
          label="Full name"
          icon="person-outline"
          placeholder="Full name"
          value={name}
          onChangeText={setName}
        />

        <FormField
          label="Username"
          icon="at-outline"
          value={username}
          editable={false}
          hint="Your username is used to log in and cannot be changed."
          style={styles.lastField}
        />
      </View>

      {/* Business details, also used to sign WhatsApp reminders */}
      <Text style={styles.sectionTitle}>BUSINESS</Text>
      <View style={styles.card}>
        <FormField
          label="Business name"
          icon="storefront-outline"
          placeholder="e.g. Musa Provisions Store"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <FormField
          label="Business phone"
          icon="call-outline"
          placeholder="Phone number customers can reach you on"
          keyboardType="phone-pad"
          value={businessPhone}
          onChangeText={setBusinessPhone}
        />

        <FormField
          label="Business address"
          icon="location-outline"
          placeholder="Shop address"
          multiline
          value={businessAddress}
          onChangeText={setBusinessAddress}
          style={styles.lastField}
        />
      </View>

      {/* Error message if saving fails */}
      <MessageBanner type="error" message={errorMessage} />

      {/* Save button, shows a spinner while saving */}
      <AppButton
        title="Save changes"
        icon="checkmark"
        loading={saving}
        onPress={() => {
          Keyboard.dismiss();
          handleSave();
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

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  avatarWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },

  username: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  lastField: {
    marginBottom: 0,
  },
});
