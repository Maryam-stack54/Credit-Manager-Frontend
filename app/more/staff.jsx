import { API_URL } from '../../constants/api';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import MessageBanner from '../../components/MessageBanner';

// Owners add their staff here and switch each person's access on or off
export default function StaffScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The owner's staff and the loading state
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Staff form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Which staff member's switch is being saved right now
  const [switchingId, setSwitchingId] = useState(null);

  // Loads this owner's staff
  const fetchStaff = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await authFetch(`${API_URL}/api/staff`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Could not load staff.');
        return;
      }

      setStaff(data.staff);
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStaff();
    }, [])
  );

  // Checks the form and adds the staff member
  const handleAddStaff = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    if (name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    // Same rules as the backend
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username.trim())) {
      setErrorMessage(
        'Username must be 3-20 characters: letters, numbers, underscores or dots.'
      );
      return;
    }

    if (password.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await authFetch(`${API_URL}/api/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Could not add the staff member.');
        return;
      }

      setSuccessMessage(
        `${data.staff.name} can now log in with the username "${data.staff.username}".`
      );
      setName('');
      setUsername('');
      setPassword('');

      await fetchStaff();
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  // Turns one staff member's access on or off
  const handleToggle = async (member, isActive) => {
    setSwitchingId(member.id);

    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await authFetch(
        `${API_URL}/api/staff/${member.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Could not change access.');
        return;
      }

      setStaff((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, isActive } : item
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSwitchingId(null);
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
      {/* Add a staff member */}
      <Text style={styles.sectionTitle}>ADD STAFF</Text>
      <View style={styles.card}>
        <Text style={styles.intro}>
          Staff log in with their own username and password. They can add and
          view customers, record credits and record payments. They cannot
          delete customers, edit credits, see the dashboard or manage staff.
        </Text>

        <FormField
          label="Full name"
          icon="person-outline"
          placeholder="Staff member's name"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        <FormField
          label="Username"
          icon="at-outline"
          placeholder="e.g. amaka.sales"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />

        <FormField
          label="Password"
          icon="lock-closed-outline"
          placeholder="At least 6 characters"
          secure
          hint="Share these details with your staff member. They can change the password later."
          value={password}
          onChangeText={setPassword}
        />

        <MessageBanner type="error" message={errorMessage} />
        <MessageBanner type="success" message={successMessage} />

        <AppButton
          title="Add staff member"
          icon="person-add-outline"
          loading={saving}
          onPress={handleAddStaff}
        />
      </View>

      {/* Everyone who works for this owner */}
      <Text style={styles.sectionTitle}>
        {`YOUR STAFF (${staff.length})`}
      </Text>

      {staff.length === 0 ? (
        <View style={styles.card}>
          <EmptyState
            compact
            icon="people-outline"
            title="No staff yet"
            text="Add a staff member above and they can start recording credits."
          />
        </View>
      ) : (
        <View style={styles.listCard}>
          {staff.map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.row,
                index === staff.length - 1 && styles.rowLast,
              ]}
            >
              <Avatar name={member.name} size={44} />

              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {member.name}
                </Text>
                <Text style={styles.rowUsername}>@{member.username}</Text>
                <Text
                  style={[
                    styles.rowStatus,
                    !member.isActive && styles.rowStatusOff,
                  ]}
                >
                  {member.isActive ? 'Access on' : 'Access off'}
                </Text>
              </View>

              <Switch
                value={member.isActive}
                disabled={switchingId === member.id}
                onValueChange={(value) => handleToggle(member, value)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </View>
      )}
    </KeyboardScreen>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  intro: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  listCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  rowInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },

  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  rowUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  rowStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 3,
  },

  rowStatusOff: {
    color: colors.danger,
  },
});
