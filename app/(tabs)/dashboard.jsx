import { API_URL } from '../../constants/api';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
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
import ScreenHeader, { HEADER_OVERLAP } from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { syncReminders } from '../../services/notificationService';

// Home screen: totals, overdue and due soon credits, top debtors and recent activity
export default function DashboardScreen() {
  const { colors } = useAppTheme();
  // Rebuild the styles only when the theme changes
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Dashboard data from the backend, plus loading, refreshing and error states
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Loads every figure on this screen from the backend in one request
  const fetchDashboard = async () => {
    try {
      setErrorMessage('');

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setErrorMessage('You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/dashboard/overview`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Could not load dashboard.');
        return;
      }

      setDashboard(data);

      // Keep payment reminders in step with the server
      syncReminders();
    } catch (error) {
      setErrorMessage('Could not connect to the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load the dashboard when the screen first opens
  useEffect(() => {
    fetchDashboard();
  }, []);

  // The owner's name for the greeting. Reloads when the tab is opened so
  // a name changed in Edit Profile shows straight away.
  const [ownerName, setOwnerName] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchOwner = async () => {
        try {
          const token = await SecureStore.getItemAsync('token');
          if (!token) return;

          const response = await authFetch(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) return;

          const data = await response.json();
          setOwnerName(data.user?.name || '');
        } catch (error) {
          // The greeting simply leaves out the name
        }
      };

      fetchOwner();
    }, [])
  );

  const firstName = ownerName.trim().split(/\s+/)[0];

  // Pull down to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // Show amounts as naira with thousands separators, e.g. ₦12,500
  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  // Show dates as e.g. 7 Oct 2026
  const formatDate = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Merges recent payments, credits and new customers into one list, newest first
  const getActivityItems = () => {
    if (!dashboard?.recentActivity) return [];

    const {
      recentCredits = [],
      recentPayments = [],
      newCustomers = [],
    } = dashboard.recentActivity;

    const activities = [];

    recentPayments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        title: 'Payment received',
        description: `${payment.customer} paid ${formatMoney(
          payment.amount
        )}`,
        date: payment.date,
      });
    });

    recentCredits.forEach((credit) => {
      activities.push({
        id: `credit-${credit.id}`,
        type: 'credit',
        title: 'Credit added',
        description: `${credit.customer} — ${formatMoney(
          credit.amount
        )}`,
        date: credit.date,
      });
    });

    newCustomers.forEach((customer) => {
      activities.push({
        id: `customer-${customer.id}`,
        type: 'customer',
        title: 'New customer',
        description: customer.name,
        date: customer.createdAt,
      });
    });

    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  };

  // Good morning, afternoon or evening depending on the time
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Today's date, shown under the greeting
  const todayLabel = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Icon and colours for each type of activity
  const activityStyles = {
    payment: {
      icon: 'arrow-down',
      background: colors.successBg,
      color: colors.successText,
    },
    credit: {
      icon: 'receipt-outline',
      background: colors.primarySoft,
      color: colors.primary,
    },
    customer: {
      icon: 'person-add-outline',
      background: colors.neutralBg,
      color: colors.neutralText,
    },
  };

  // Show a spinner until the data arrives
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Show a friendly message if the data could not be loaded
  if (errorMessage) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Something went wrong"
          text={errorMessage}
        />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="bar-chart-outline"
          title="No dashboard data available."
        />
      </View>
    );
  }

  const { summary, attention } = dashboard;

  const activityItems = getActivityItems();

  // Keep the progress bar between 0% and 100%
  const collectionRate = Math.max(
    0,
    Math.min(100, Number(summary.collectionRate) || 0)
  );

  // The four Overview cards
  const stats = [
    {
      icon: 'people-outline',
      value: summary.customersOwing,
      label: 'Customers owing',
    },
    {
      icon: 'receipt-outline',
      value: summary.activeCredits,
      label: 'Active credits',
    },
    {
      icon: 'wallet-outline',
      value: formatMoney(summary.totalCollected),
      label: 'Total collected',
    },
    {
      icon: 'trending-up-outline',
      value: formatMoney(summary.totalCreditGiven),
      label: 'Total credit given',
    },
  ];

  // One row in the Overdue or Due Soon lists
  const renderCreditRow = (credit, index, list, tone) => (
    <View
      key={credit.id}
      style={[
        styles.listRow,
        index === list.length - 1 && styles.listRowLast,
      ]}
    >
      <Avatar name={credit.customer} size={40} />

      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle} numberOfLines={1}>
          {credit.customer}
        </Text>

        <Text style={styles.listRowSubtitle}>
          Due {formatDate(credit.dueDate)}
        </Text>
      </View>

      <Text
        style={[
          styles.listRowAmount,
          tone === 'danger' && styles.dangerAmount,
        ]}
      >
        {formatMoney(credit.balance)}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <ScreenHeader
        subtitle={firstName ? `${getGreeting()},` : todayLabel}
        title={firstName || getGreeting()}
        description={firstName ? todayLabel : undefined}
        right={
          ownerName ? (
            <Pressable
              onPress={() => router.push('/(tabs)/more')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
            >
              <Avatar name={ownerName} size={46} inverted />
            </Pressable>
          ) : null
        }
      />

      {/* TOTAL OUTSTANDING */}
      <View style={styles.heroCard}>
        {/* Wallet icon and label */}
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="wallet" size={18} color={colors.primary} />
          </View>

          <Text style={styles.heroLabel}>Total Outstanding</Text>
        </View>

        {/* Total still owed, shrunk to fit on small phones */}
        <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(summary.totalOutstanding)}
        </Text>

        <Text style={styles.heroDescription}>
          Money customers still owe you
        </Text>

        {/* COLLECTION SUMMARY */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Collected this week</Text>
            <Text style={styles.heroStatValue}>
              {formatMoney(summary.collectedThisWeek)}
            </Text>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Collection rate</Text>
            <Text style={styles.heroStatValue}>
              {summary.collectionRate}%
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${collectionRate}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* QUICK STATS */}
      <Text style={styles.sectionTitle}>Overview</Text>

      {/* Two cards per row */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name={stat.icon} size={18} color={colors.primary} />
            </View>

            <Text
              style={styles.statNumber}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {stat.value}
            </Text>

            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* NEEDS ATTENTION */}
      <Text style={styles.sectionTitle}>Needs Attention</Text>

      {/* OVERDUE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.dangerIcon]}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.dangerText}
            />
          </View>

          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Overdue</Text>

            <Text style={styles.cardSubtitle}>
              {attention.overdueCredits.length} overdue credit
              {attention.overdueCredits.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Total value of all overdue credits */}
          <Text style={styles.overdueAmount}>
            {formatMoney(summary.amountOverdue)}
          </Text>
        </View>

        {attention.overdueCredits.length === 0 ? (
          <EmptyState
            compact
            icon="checkmark-done"
            text="Nothing is overdue."
          />
        ) : (
          attention.overdueCredits.map((credit, index, list) =>
            renderCreditRow(credit, index, list, 'danger')
          )
        )}
      </View>

      {/* DUE SOON */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, styles.warningIcon]}>
            <Ionicons name="time" size={18} color={colors.warningText} />
          </View>

          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Due Soon</Text>
            <Text style={styles.cardSubtitle}>Next 7 days</Text>
          </View>
        </View>

        {attention.dueSoonCredits.length === 0 ? (
          <EmptyState
            compact
            icon="calendar-clear-outline"
            text="No credits are due soon."
          />
        ) : (
          attention.dueSoonCredits.map((credit, index, list) =>
            renderCreditRow(credit, index, list)
          )
        )}
      </View>

      {/* TOP OUTSTANDING CUSTOMERS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name="podium" size={17} color={colors.primary} />
          </View>

          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Top Outstanding Customers</Text>
            <Text style={styles.cardSubtitle}>
              Customers with the highest balances
            </Text>
          </View>
        </View>

        {attention.topOutstandingCustomers.length === 0 ? (
          <EmptyState
            compact
            icon="happy-outline"
            text="No outstanding balances."
          />
        ) : (
          attention.topOutstandingCustomers.map((customer, index, list) => (
            <View
              key={customer.id}
              style={[
                styles.listRow,
                index === list.length - 1 && styles.listRowLast,
              ]}
            >
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <Avatar name={customer.name} size={40} />

              <Text
                style={[styles.listRowTitle, styles.listRowText]}
                numberOfLines={1}
              >
                {customer.name}
              </Text>

              <Text style={styles.listRowAmount}>
                {formatMoney(customer.balance)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* RECENT ACTIVITY */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>

      <View style={styles.card}>
        {activityItems.length === 0 ? (
          <EmptyState
            compact
            icon="pulse-outline"
            text="No recent activity."
          />
        ) : (
          activityItems.map((activity, index) => {
            const look = activityStyles[activity.type];

            return (
              <View
                key={activity.id}
                style={[
                  styles.listRow,
                  index === activityItems.length - 1 && styles.listRowLast,
                ]}
              >
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: look.background },
                  ]}
                >
                  <Ionicons name={look.icon} size={18} color={look.color} />
                </View>

                <View style={styles.listRowText}>
                  <Text style={styles.listRowTitle}>{activity.title}</Text>

                  <Text style={styles.listRowSubtitle} numberOfLines={1}>
                    {activity.description}
                  </Text>
                </View>

                <Text style={styles.activityDate}>
                  {formatDate(activity.date)}
                </Text>
              </View>
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
    paddingBottom: 32,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    marginTop: -HEADER_OVERLAP,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  heroIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  heroLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },

  heroDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },

  heroStats: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },

  heroStat: {
    flex: 1,
  },

  heroStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },

  heroStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  heroStatValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },

  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },

  // Cards with lists
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  dangerIcon: {
    backgroundColor: colors.dangerBg,
  },

  warningIcon: {
    backgroundColor: colors.warningBg,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  overdueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
    marginLeft: 8,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  listRowLast: {
    borderBottomWidth: 0,
  },

  listRowText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  listRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  listRowSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  listRowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  dangerAmount: {
    color: colors.danger,
  },

  rank: {
    width: 22,
    alignItems: 'center',
    marginRight: 6,
  },

  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
