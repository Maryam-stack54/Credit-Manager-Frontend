import { API_URL } from '../../constants/api';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import { clearRole } from '../../services/session';
import { setUnlocked } from '../../services/appLock';
import { cancelAllCreditReminders } from '../../services/notificationService';
import KeyboardScreen from '../../components/KeyboardScreen';
import ScreenHeader, { HEADER_OVERLAP } from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';

// One number in the totals grid
function StatTile({ icon, label, value }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Admin area: overall totals and the list of shop owners. The admin works
// with counts only. No customers, credits or amounts owed are shown here.
export default function AdminScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [totals, setTotals] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Which owner's switch is being saved right now
  const [switchingId, setSwitchingId] = useState(null);

  // Loads the totals and the owners
  const fetchAdminData = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewResponse, ownersResponse] = await Promise.all([
        authFetch(`${API_URL}/api/admin/overview`, { method: 'GET', headers }),
        authFetch(`${API_URL}/api/admin/owners`, { method: 'GET', headers }),
      ]);

      const overview = await overviewResponse.json();
      const ownersData = await ownersResponse.json();

      if (!overviewResponse.ok || !ownersResponse.ok) {
        Alert.alert(
          'Error',
          overview.message || ownersData.message || 'Could not load the admin data.'
        );
        return;
      }

      setTotals(overview.totals);
      setOwners(ownersData.owners);
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdminData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // Turns a shop owner's account on or off. While it is off, the owner and
  // all of their staff cannot log in.
  const handleToggle = (owner, isActive) => {
    const change = async () => {
      setSwitchingId(owner.id);

      try {
        const token = await SecureStore.getItemAsync('token');

        const response = await authFetch(
          `${API_URL}/api/admin/owners/${owner.id}/status`,
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
          Alert.alert('Error', data.message || 'Could not change the account.');
          return;
        }

        await fetchAdminData();
      } catch (error) {
        Alert.alert('Error', 'Could not connect to the server.');
      } finally {
        setSwitchingId(null);
      }
    };

    // Turning an account off locks out the whole shop, so confirm first
    if (!isActive) {
      Alert.alert(
        'Turn off this account?',
        `${owner.name} and all of their staff will not be able to log in until you turn it back on.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Turn off', style: 'destructive', onPress: change },
        ]
      );
    } else {
      change();
    }
  };

  // Asks for confirmation, then clears the saved login
  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setUnlocked(false);
          await cancelAllCreditReminders();
          await SecureStore.deleteItemAsync('token');
          await clearRole();
          router.replace('/auth/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardScreen
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Green header with the title and the log out button */}
      <ScreenHeader
        title="Admin"
        description="Manage the shops using Credit Manager"
        right={
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={22} color="#0B3D2C" />
          </Pressable>
        }
      />

      <View style={styles.overlap}>
        {/* Overall totals */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatTile icon="storefront-outline" label="Shop owners" value={totals?.owners ?? 0} />
            <StatTile icon="people-outline" label="Staff" value={totals?.staff ?? 0} />
            <StatTile icon="person-outline" label="Customers" value={totals?.customers ?? 0} />
            <StatTile icon="receipt-outline" label="Credits" value={totals?.credits ?? 0} />
          </View>

          <Text style={styles.statsNote}>
            {totals?.disabledOwners
              ? `${totals.disabledOwners} shop${totals.disabledOwners !== 1 ? 's are' : ' is'} turned off`
              : 'All shops are active'}
          </Text>
        </View>

        <Text style={styles.privacyNote}>
          For privacy, the admin sees only counts. Customers and what they owe
          stay private to each shop.
        </Text>

        {/* Every shop owner */}
        <Text style={styles.sectionTitle}>
          {`SHOP OWNERS (${owners.length})`}
        </Text>

        {owners.length === 0 ? (
          <View style={styles.card}>
            <EmptyState
              compact
              icon="storefront-outline"
              title="No shop owners yet"
              text="Owners appear here after they register in the app."
            />
          </View>
        ) : (
          <View style={styles.listCard}>
            {owners.map((owner, index) => (
              <View
                key={owner.id}
                style={[
                  styles.ownerRow,
                  index === owners.length - 1 && styles.ownerRowLast,
                ]}
              >
                <View style={styles.ownerTop}>
                  <Avatar name={owner.name} size={44} />

                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName} numberOfLines={1}>
                      {owner.name}
                    </Text>
                    <Text style={styles.ownerMeta} numberOfLines={1}>
                      @{owner.username}
                      {owner.businessName ? ` · ${owner.businessName}` : ''}
                    </Text>
                    <Text
                      style={[
                        styles.ownerStatus,
                        !owner.isActive && styles.ownerStatusOff,
                      ]}
                    >
                      {owner.isActive ? 'Account on' : 'Account off'}
                    </Text>
                  </View>

                  <Switch
                    value={owner.isActive}
                    disabled={switchingId === owner.id}
                    onValueChange={(value) => handleToggle(owner, value)}
                    trackColor={{ true: colors.primary }}
                  />
                </View>

                {/* How big this shop is */}
                <View style={styles.countsRow}>
                  <Text style={styles.countText}>
                    <Text style={styles.countNumber}>{owner.staffCount}</Text> staff
                  </Text>
                  <Text style={styles.countText}>
                    <Text style={styles.countNumber}>{owner.customerCount}</Text> customers
                  </Text>
                  <Text style={styles.countText}>
                    <Text style={styles.countNumber}>{owner.creditCount}</Text> credits
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.linkRow,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/more/change-password')}
        >
          <Ionicons name="key-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Change password</Text>
        </Pressable>
      </View>
    </KeyboardScreen>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  headerButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6FE3A8',
    justifyContent: 'center',
    alignItems: 'center',
    ...colors.shadow,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  overlap: {
    marginTop: -HEADER_OVERLAP,
  },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  statsRow: {
    flexDirection: 'row',
  },

  statTile: {
    flex: 1,
    alignItems: 'center',
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  statsNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
  },

  privacyNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 8,
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
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  listCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  ownerRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  ownerRowLast: {
    borderBottomWidth: 0,
  },

  ownerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ownerInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },

  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  ownerMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  ownerStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 3,
  },

  ownerStatusOff: {
    color: colors.danger,
  },

  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 12,
  },

  countText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  countNumber: {
    fontWeight: '800',
    color: colors.text,
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },

  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
});
