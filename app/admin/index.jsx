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
  TextInput,
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
import EmptyState from '../../components/EmptyState';

// One number in the totals grid
function StatCell({ value, label, style }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.statCell, style]}>
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

  // Search box and the All / Off filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

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

  // Owners matching the search box (name, username or shop name) and the filter
  const query = search.trim().toLowerCase();
  const offCount = owners.filter((owner) => !owner.isActive).length;

  const visibleOwners = owners.filter((owner) => {
    if (filter === 'off' && owner.isActive) return false;

    if (!query) return true;

    return [owner.name, owner.username, owner.businessName]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(query));
  });

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
        {/* Overall totals in a simple 2 by 2 grid */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatCell
              value={totals?.owners ?? 0}
              label="Shop owners"
              style={styles.statCellDivider}
            />
            <StatCell value={totals?.staff ?? 0} label="Staff" />
          </View>

          <View style={[styles.statsRow, styles.statsRowDivider]}>
            <StatCell
              value={totals?.customers ?? 0}
              label="Customers"
              style={styles.statCellDivider}
            />
            <StatCell value={totals?.credits ?? 0} label="Credits" />
          </View>

          <Text style={[styles.statsNote, offCount > 0 && styles.statsNoteOff]}>
            {offCount > 0
              ? `${offCount} shop${offCount !== 1 ? 's are' : ' is'} turned off`
              : 'All shops are active'}
          </Text>
        </View>

        {/* Search and the All / Off filter */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username or shop"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chipRow}>
          {[
            { key: 'all', label: `All (${owners.length})` },
            { key: 'off', label: `Off (${offCount})` },
          ].map((chip) => (
            <Pressable
              key={chip.key}
              style={[styles.chip, filter === chip.key && styles.chipActive]}
              onPress={() => setFilter(chip.key)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.chipText,
                  filter === chip.key && styles.chipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* The shop owners, one compact row each */}
        {visibleOwners.length === 0 ? (
          <View style={styles.card}>
            <EmptyState
              compact
              icon={owners.length === 0 ? 'storefront-outline' : 'search-outline'}
              title={owners.length === 0 ? 'No shop owners yet' : 'No matches'}
              text={
                owners.length === 0
                  ? 'Owners appear here after they register in the app.'
                  : 'No shop owner matches your search or filter.'
              }
            />
          </View>
        ) : (
          <View style={styles.listCard}>
            {visibleOwners.map((owner, index) => (
              <View
                key={owner.id}
                style={[
                  styles.ownerRow,
                  index === visibleOwners.length - 1 && styles.ownerRowLast,
                ]}
              >
                <View style={styles.ownerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.ownerName} numberOfLines={1}>
                      {owner.name}
                    </Text>
                    {!owner.isActive ? (
                      <Text style={styles.offBadge}>Off</Text>
                    ) : null}
                  </View>

                  <Text style={styles.ownerUsername} numberOfLines={1}>
                    @{owner.username}
                    {owner.businessName ? ` · ${owner.businessName}` : ''}
                  </Text>

                  <Text style={styles.ownerCounts} numberOfLines={1}>
                    {`${owner.staffCount} staff · ${owner.customerCount} customers · ${owner.creditCount} credits`}
                  </Text>
                </View>

                <Switch
                  value={owner.isActive}
                  disabled={switchingId === owner.id}
                  onValueChange={(value) => handleToggle(owner, value)}
                  trackColor={{ true: colors.primary }}
                />
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

        <Text style={styles.privacyNote}>
          The admin sees counts only. Customers and what they owe stay private
          to each shop.
        </Text>
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
    paddingTop: 6,
    paddingBottom: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  statsRow: {
    flexDirection: 'row',
  },

  statsRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },

  statCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },

  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  statsNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  statsNoteOff: {
    color: colors.danger,
    fontWeight: '600',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 14,
    marginBottom: 12,
    ...colors.shadow,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
    paddingVertical: 0,
  },

  chipRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
    marginRight: 8,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  chipTextActive: {
    color: colors.onPrimary,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  ownerRowLast: {
    borderBottomWidth: 0,
  },

  ownerInfo: {
    flex: 1,
    marginRight: 10,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ownerName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  offBadge: {
    marginLeft: 8,
    backgroundColor: colors.dangerBg,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },

  ownerUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  ownerCounts: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 10,
  },

  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },

  privacyNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
});
