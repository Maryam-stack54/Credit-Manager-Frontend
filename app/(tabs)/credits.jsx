import { API_URL } from '../../constants/api';
import { router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { isOverdue } from '../../components/StatusBadge';
import ScreenHeader, { HEADER_OVERLAP } from '../../components/ScreenHeader';
import { syncReminders } from '../../services/notificationService';

// Credits tab: every credit with filters and a summary of what is still owed
export default function CreditsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The credit list and its loading states
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Which credits to show (All, Unpaid, Overdue or Paid)
  const [filter, setFilter] = useState('all');

  // Loads the logged-in user's credits
  const fetchCredits = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/credits/getCredits`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Error',
          data.message || 'Could not load credits.'
        );
        return;
      }

      setCredits(data.credits || data);

      // Keep payment reminders in step with the server
      syncReminders(data.credits || data);
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not connect to the server.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load the credits when the screen first opens
  useEffect(() => {
    fetchCredits();
  }, []);

  // Pull down to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchCredits();
  };

  // Show amounts as naira with thousands separators
  const formatAmount = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  // Show dates as e.g. 07 Oct 2026
  const formatDate = (date) => {
    if (!date) return 'No date';

    return new Date(date).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Show a spinner until the credits arrive
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.loadingText}>
          Loading credits...
        </Text>
      </View>
    );
  }

  // Summary figures shown at the top
  const totalBalance = credits.reduce(
    (sum, credit) => sum + Number(credit.balance || 0),
    0
  );
  const openCredits = credits.filter(
    (credit) => Number(credit.balance) > 0
  ).length;
  const overdueCount = credits.filter(isOverdue).length;

  // The filter chips and the test each credit must pass to be shown
  const FILTERS = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'unpaid', label: 'Unpaid', test: (c) => Number(c.balance) > 0 },
    { key: 'overdue', label: 'Overdue', test: isOverdue },
    { key: 'paid', label: 'Paid', test: (c) => Number(c.balance) === 0 },
  ];

  const activeFilter =
    FILTERS.find((item) => item.key === filter) || FILTERS[0];

  // Money still owed comes first, soonest due date at the top
  const visibleCredits = credits
    .filter(activeFilter.test)
    .sort((a, b) => {
      const aPaid = Number(a.balance) === 0;
      const bPaid = Number(b.balance) === 0;
      if (aPaid !== bPaid) return aPaid ? 1 : -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Green header with the page title */}
      <ScreenHeader
        title="Credits"
        description="Track customer debts and payments"
      />

      {/* Everything below slides up slightly over the green header */}
      <View style={styles.overlap}>
        {credits.length > 0 ? (
          <View style={styles.summary}>
            {/* Total still to collect */}
            <View style={styles.summaryMain}>
              <Text style={styles.summaryLabel}>Still to collect</Text>
              <Text
                style={styles.summaryAmount}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {formatAmount(totalBalance)}
              </Text>
            </View>

            {/* Open and overdue counts; tapping Overdue filters the list */}
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{openCredits}</Text>
                <Text style={styles.summaryStatLabel}>Open</Text>
              </View>

              <Pressable
                style={styles.summaryStat}
                onPress={() => setFilter('overdue')}
                accessibilityRole="button"
                accessibilityLabel="Show overdue credits"
              >
                <Text
                  style={[
                    styles.summaryStatValue,
                    overdueCount > 0 && styles.summaryOverdue,
                  ]}
                >
                  {overdueCount}
                </Text>
                <Text style={styles.summaryStatLabel}>Overdue</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {credits.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroller}
          >
            {FILTERS.map((item) => {
              const selected = item.key === activeFilter.key;
              const count = credits.filter(item.test).length;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                  >
                    {item.label}
                  </Text>
                  <View
                    style={[styles.chipCount, selected && styles.chipCountSelected]}
                  >
                    <Text
                      style={[
                        styles.chipCountText,
                        selected && styles.chipCountTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {credits.length > 0 && visibleCredits.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              compact
              icon={activeFilter.key === 'overdue' ? 'happy-outline' : 'filter-outline'}
              title={
                activeFilter.key === 'overdue'
                  ? 'Nothing is overdue'
                  : `No ${activeFilter.label.toLowerCase()} credits`
              }
              text="Tap All to see every credit."
            />
          </View>
        ) : null}

        {credits.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              icon="receipt-outline"
              title="No credits yet"
              text="Credits you create for your customers will appear here. Open a customer and tap New Credit to start."
            />
          </View>
        ) : (
          visibleCredits.map((credit) => {
            const customerName =
              credit.customer?.name || 'Unknown customer';
            // Overdue credits are highlighted in red
            const overdue = isOverdue(credit);
            const total = Number(credit.totalAmount || 0);
            const paid = Math.max(0, total - Number(credit.balance || 0));
            // How much of this credit has been paid, for the progress bar
            const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;

            return (
              <Pressable
                key={credit._id}
                style={({ pressed }) => [
                  styles.creditCard,
                  overdue && styles.creditCardOverdue,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  router.push({
                    pathname: '/credits/[id]',
                    params: { id: credit._id },
                  });
                }}
              >
                {/* Customer, credit date and status */}
                <View style={styles.topRow}>
                  <Avatar name={customerName} size={42} />

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customerName}
                    </Text>

                    <Text style={styles.creditDate}>
                      Credit date: {formatDate(credit.creditDate)}
                    </Text>
                  </View>

                  <StatusBadge status={overdue ? 'Overdue' : credit.status} />
                </View>

                {/* Balance still owed and the original total */}
                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.label}>Balance</Text>
                    <Text
                      style={[styles.balance, overdue && styles.balanceOverdue]}
                    >
                      {formatAmount(credit.balance)}
                    </Text>
                  </View>

                  <View style={styles.amountRight}>
                    <Text style={styles.label}>Total</Text>
                    <Text style={styles.amount}>
                      {formatAmount(credit.totalAmount)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar showing how much has been paid */}
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${paidPercent}%` }]}
                  />
                </View>

                {/* Due date and percentage paid */}
                <View style={styles.bottomRow}>
                  <View style={styles.dueRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={overdue ? colors.danger : colors.textMuted}
                    />
                    <Text
                      style={[styles.dueDate, overdue && styles.dueDateOverdue]}
                    >
                      Due {formatDate(credit.dueDate)}
                    </Text>
                  </View>

                  <Text style={styles.paidText}>{paidPercent}% paid</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
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

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Summary strip
  overlap: {
    marginTop: -HEADER_OVERLAP,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  summaryMain: {
    flex: 1,
    marginRight: 12,
  },

  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginTop: 2,
  },

  summaryStats: {
    flexDirection: 'row',
  },

  summaryStat: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    minWidth: 62,
  },

  summaryStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  summaryOverdue: {
    color: colors.danger,
  },

  summaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },

  chipsScroller: {
    marginHorizontal: -20,
    marginBottom: 16,
  },

  chips: {
    paddingHorizontal: 20,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    marginRight: 8,
  },

  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  chipTextSelected: {
    color: colors.onPrimary,
  },

  chipCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  chipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  chipCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  chipCountTextSelected: {
    color: colors.onPrimary,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  // Credit cards
  creditCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  creditCardOverdue: {
    borderColor: colors.dangerBg,
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  creditDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },

  amountRight: {
    alignItems: 'flex-end',
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 3,
  },

  balance: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  balanceOverdue: {
    color: colors.danger,
  },

  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    marginTop: 14,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dueDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },

  dueDateOverdue: {
    color: colors.danger,
    fontWeight: '700',
  },

  paidText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
