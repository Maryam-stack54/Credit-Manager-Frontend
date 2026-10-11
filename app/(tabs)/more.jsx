import { API_URL } from '../../constants/api';
import { useCallback, useState, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  APPEARANCE_OPTIONS,
  useAppTheme,
} from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import ScreenHeader, { HEADER_OVERLAP } from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import {
  cancelAllCreditReminders,
  getReminderDays,
  getReminderSummary,
} from '../../services/notificationService';
import {
  getDeviceUnlockMethod,
  isQuickLoginEnabled,
  setQuickLoginEnabled,
  setUnlocked,
} from '../../services/appLock';

// What the login screen offers on this phone, shown under the switch
const UNLOCK_METHOD_NAMES = {
  fingerprint: 'Log in with your fingerprint',
  face: 'Log in with your face',
  iris: 'Log in with your iris',
  device:
    Platform.OS === 'ios'
      ? 'Log in with your phone passcode'
      : 'Log in with your phone PIN or pattern',
  none: 'Set up a screen lock on this phone to use this',
};

// One tappable row in the More menu
function MenuRow({ icon, label, value, onPress, isLast }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isLast && styles.rowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      {/* Icon on the left of the row */}
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <Text style={styles.rowLabel}>{label}</Text>

      <View style={styles.rowRight}>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// More tab: profile, account settings, preferences, help and log out
export default function MoreScreen() {
  const { colors, preference } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Profile, reminder setting and fingerprint login setting shown on this screen
  const [profile, setProfile] = useState(null);
  const [reminderDays, setReminderDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [quickLoginOn, setQuickLoginOn] = useState(true);
  const [unlockMethod, setUnlockMethod] = useState(null);

  // Loads the owner's name, username and business name
  const fetchProfile = async () => {
    try {
      setErrorMessage('');

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setErrorMessage('You are not logged in.');
        return;
      }

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

      setProfile(data.user);
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever the tab is opened, so profile edits show straight away
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      getReminderDays().then(setReminderDays);
      isQuickLoginEnabled().then(setQuickLoginOn);
      getDeviceUnlockMethod().then(setUnlockMethod);
    }, [])
  );

  // Asks for confirmation, then clears the saved login and reminders
  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          // Don't leave this account's reminders on the phone
          setUnlocked(false);
          await cancelAllCreditReminders();
          await SecureStore.deleteItemAsync('token');
          router.replace('/auth/welcome');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Green header */}
      <ScreenHeader title="More" />

      {/* Profile card: tap it to edit the profile */}
      <Pressable
        style={({ pressed }) => [
          styles.profileCard,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push('/more/edit-profile')}
        disabled={!profile}
      >
        <View style={styles.profileRing} />

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : profile ? (
          <>
            <Avatar name={profile.name} size={60} />

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={styles.profileUsername}>@{profile.username}</Text>

              {profile.businessName ? (
                <View style={styles.businessChip}>
                  <Ionicons
                    name="storefront"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={styles.businessText} numberOfLines={1}>
                    {profile.businessName}
                  </Text>
                </View>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textMuted}
            />
          </>
        ) : (
          <Text style={styles.profileError}>{errorMessage}</Text>
        )}
      </Pressable>

      {/* Account settings */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.section}>
        <MenuRow
          icon="person-outline"
          label="Edit profile"
          onPress={() => router.push('/more/edit-profile')}
        />
        <MenuRow
          icon="storefront-outline"
          label="Business details"
          value={profile?.businessName || 'Not set'}
          onPress={() => router.push('/more/edit-profile')}
        />
        <MenuRow
          icon="key-outline"
          label="Change password"
          onPress={() => router.push('/more/change-password')}
        />

        {/* Fingerprint login switch, greyed out on phones without a screen lock */}
        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="finger-print"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.rowTextBlock}>
            <Text style={styles.rowLabel}>Fingerprint login</Text>
            <Text style={styles.rowHint}>
              {UNLOCK_METHOD_NAMES[unlockMethod] || 'Checking...'}
            </Text>
          </View>

          <Switch
            value={quickLoginOn && unlockMethod !== 'none'}
            disabled={unlockMethod === 'none'}
            onValueChange={async (enabled) => {
              setQuickLoginOn(enabled);
              await setQuickLoginEnabled(enabled);
            }}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      {/* Theme and payment reminder settings */}
      <Text style={styles.sectionTitle}>PREFERENCES</Text>
      <View style={styles.section}>
        <MenuRow
          icon="contrast-outline"
          label="Appearance"
          value={
            APPEARANCE_OPTIONS.find((option) => option.value === preference)
              ?.label
          }
          onPress={() => router.push('/more/appearance')}
        />
        <MenuRow
          icon="notifications-outline"
          label="Payment reminders"
          value={reminderDays ? getReminderSummary(reminderDays) : ''}
          onPress={() => router.push('/more/reminders')}
          isLast
        />
      </View>

      {/* Help and information about the app */}
      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <View style={styles.section}>
        <MenuRow
          icon="help-circle-outline"
          label="Help & About"
          onPress={() => router.push('/more/help')}
          isLast
        />
      </View>

      {/* Log out button */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.rowPressed,
        ]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      {/* App version */}
      <Text style={styles.version}>Credit Manager v1.0.0</Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  profileCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: -HEADER_OVERLAP,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
    marginBottom: 28,
    overflow: 'hidden',
    ...colors.shadow,
  },

  cardPressed: {
    opacity: 0.92,
  },

  profileRing: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 30,
    borderColor: colors.primarySoft,
  },

  profileInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },

  profileName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  profileUsername: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  businessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
  },

  businessText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },

  profileError: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  rowTextBlock: {
    flex: 1,
    marginRight: 10,
  },

  rowHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },

  rowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 12,
  },

  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 6,
    flexShrink: 1,
  },

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerBg,
    paddingVertical: 15,
  },

  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 20,
  },
});
