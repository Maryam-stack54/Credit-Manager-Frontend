import { API_URL } from '../../constants/api';
import { useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { authFetch } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import KeyboardScreen from '../../components/KeyboardScreen';
import FormField from '../../components/FormField';
import AppButton from '../../components/AppButton';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import ScreenHeader, { HEADER_OVERLAP } from '../../components/ScreenHeader';

// Customers tab: search, add and open customers
export default function CustomersScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The customer list and its loading states
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Customer form: whether it is open and what has been typed
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  // Text typed in the search bar
  const [search, setSearch] = useState('');


  // Customers matching the search box (name, phone or address)
  const query = search.trim().toLowerCase();
  const filteredCustomers = query
    ? customers.filter((customer) =>
        [customer.name, customer.phone, customer.address]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query))
      )
    : customers;

  // Loads the logged-in user's customers
  const fetchCustomers = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/customers/getCustomers`,
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
          data.message || 'Could not load customers.'
        );
        return;
      }

      setCustomers(data.customers || data);
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

  // Load the customers when the screen first opens
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Pull down to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  // Clear the Add Customer form
  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
  };

  // Checks the form, saves the customer and reloads the list
  const handleAddCustomer = async () => {
    // Name and phone number are required
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter the customer name.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        'Missing phone number',
        'Please enter the customer phone number.'
      );
      return;
    }

    try {
      setSaving(true);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/customers/createCustomer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not add customer',
          data.message || 'Something went wrong.'
        );
        return;
      }

      Alert.alert(
        'Customer added',
        `${name.trim()} has been added successfully.`
      );

      resetForm();
      setShowForm(false);

      await fetchCustomers();
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not connect to the server.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Show a spinner until the customers arrive
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.loadingText}>
          Loading customers...
        </Text>
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
      {/* Green header with the title and the add button */}
      <ScreenHeader
        title="Customers"
        description="Manage your customers and their credits"
        right={
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              showForm && styles.addButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowForm(!showForm)}
            accessibilityRole="button"
            accessibilityLabel={showForm ? 'Cancel' : 'Add customer'}
          >
            <Ionicons
              name={showForm ? 'close' : 'add'}
              size={26}
              color={showForm ? colors.heroText : '#0B3D2C'}
            />
          </Pressable>
        }
      />

      {/* Everything below slides up slightly over the green header */}
      <View style={styles.overlap}>
        {showForm && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.formCard}
          >
            {/* Form title and icon */}
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons
                  name="person-add"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View>
                <Text style={styles.formTitle}>Add Customer</Text>
                <Text style={styles.formSubtitle}>
                  Save their details to start giving credit
                </Text>
              </View>
            </View>

            <FormField
              label="Name"
              icon="person-outline"
              placeholder="Customer name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

            <FormField
              label="Phone number"
              icon="call-outline"
              placeholder="e.g. 08012345678"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <FormField
              label="Address (optional)"
              icon="location-outline"
              placeholder="Where they live or work"
              value={address}
              onChangeText={setAddress}
            />

            <AppButton
              title="Save Customer"
              icon="checkmark"
              loading={saving}
              onPress={handleAddCustomer}
            />
          </Animated.View>
        )}

        {customers.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              icon="people-outline"
              title="No customers yet"
              text="Add your first customer to start tracking their credits."
            />

            {!showForm ? (
              <AppButton
                title="Add your first customer"
                icon="add"
                variant="soft"
                onPress={() => setShowForm(true)}
                style={styles.emptyButton}
              />
            ) : null}
          </View>
        ) : (
          <>
            {/* Search bar that filters the list as you type */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, phone or address"
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
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
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Number of customers, or number of matches while searching */}
            <Text style={styles.listLabel}>
              {search
                ? `${filteredCustomers.length} OF ${customers.length} CUSTOMERS`
                : `${customers.length} CUSTOMER${customers.length !== 1 ? 'S' : ''}`}
            </Text>

            {filteredCustomers.length === 0 ? (
              <View style={styles.emptyCard}>
                <EmptyState
                  compact
                  icon="search-outline"
                  title="No matches"
                  text={`No customer matches "${search.trim()}".`}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.listCard,
                filteredCustomers.length === 0 && styles.hidden,
              ]}
            >
              {filteredCustomers.map((customer, index) => (
                <Pressable
                  key={customer._id}
                  style={({ pressed }) => [
                    styles.customerRow,
                    index === filteredCustomers.length - 1 &&
                      styles.customerRowLast,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: '/customers/[id]',
                      params: { id: customer._id },
                    });
                  }}
                >
                  {/* Customer's initials */}
                  <Avatar name={customer.name} size={46} />

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customer.name}
                    </Text>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="call-outline"
                        size={13}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaText}>{customer.phone}</Text>
                    </View>

                    {customer.address ? (
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color={colors.textMuted}
                        />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {customer.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}
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

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },

  addButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6FE3A8',
    justifyContent: 'center',
    alignItems: 'center',
    ...colors.shadow,
  },

  addButtonActive: {
    backgroundColor: colors.heroSoft,
  },

  overlap: {
    marginTop: -HEADER_OVERLAP,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  formCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  formIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  emptyButton: {
    marginTop: 4,
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
    marginBottom: 18,
    ...colors.shadow,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
    paddingVertical: 0,
  },

  hidden: {
    display: 'none',
  },

  listLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  listCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  customerRowLast: {
    borderBottomWidth: 0,
  },

  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  customerInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },

  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 5,
  },
});
