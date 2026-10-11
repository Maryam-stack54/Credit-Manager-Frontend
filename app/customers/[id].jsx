import { API_URL } from '../../constants/api';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';

import { scheduleCreditReminders } from '../../services/notificationService';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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
import StatusBadge, { isOverdue } from '../../components/StatusBadge';
import useSenderName from '../../hooks/useSenderName';
import { buildCustomerReminder, openWhatsApp } from '../../services/whatsapp';

// One customer: their details, total owed, credit history and new credit form
export default function CustomerDetails() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id } = useLocalSearchParams();
  const router = useRouter();

  // The customer, their credits and loading states
  const [customer, setCustomer] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Credit states
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [items, setItems] = useState([
    {
      name: '',
      quantity: '1',
      price: '',
    },
  ]);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);

  // Edit Customer states
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Signs WhatsApp reminders with the business name
  const senderName = useSenderName();

  // Loads the customer and their credits
  const fetchCustomerDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const customerResponse = await authFetch(
        `${API_URL}/api/customers/getCustomer/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const customerData = await customerResponse.json();

      if (!customerResponse.ok) {
        Alert.alert(
          'Error',
          customerData.message || 'Could not load customer.'
        );
        return;
      }

      const creditsResponse = await authFetch(
        `${API_URL}/api/credits/getCredits`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const creditsData = await creditsResponse.json();

      if (!creditsResponse.ok) {
        Alert.alert(
          'Error',
          creditsData.message || 'Could not load credits.'
        );
        return;
      }

      setCustomer(customerData.customer);

      const customerCredits = creditsData.credits.filter(
        (credit) =>
          credit.customer &&
          credit.customer._id === customerData.customer._id
      );

      setCredits(customerCredits);
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load the customer when the screen opens
  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  // Pull down to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerDetails();
  };

  // -----------------------------
  // ADD CREDIT
  // -----------------------------

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];

    updatedItems[index][field] = value;

    setItems(updatedItems);
  };

  // Adds an empty item row to the New Credit form
  const addItem = () => {
    setItems([
      ...items,
      {
        name: '',
        quantity: '1',
        price: '',
      },
    ]);
  };

  // Removes an item row from the New Credit form
  const removeItem = (index) => {
    if (items.length === 1) {
      return;
    }

    const updatedItems = items.filter((_, itemIndex) => itemIndex !== index);

    setItems(updatedItems);
  };

  // Quantity times price for one item
  const calculateItemTotal = (item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;

    return quantity * price;
  };

  // Total of all items in the New Credit form
  const calculateCreditTotal = () => {
    return items.reduce(
      (total, item) => total + calculateItemTotal(item),
      0
    );
  };

  // Checks the items and due date, saves the credit and schedules its reminders
  const handleCreateCredit = async () => {
    // Shown if the customer no longer exists
    if (!customer) {
      return;
    }

    for (const item of items) {
      if (!item.name.trim()) {
        Alert.alert('Missing item name', 'Please enter a name for every item.');
        return;
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        Alert.alert(
          'Invalid quantity',
          'Quantity must be greater than zero.'
        );
        return;
      }

      if (item.price === '' || Number(item.price) < 0) {
        Alert.alert(
          'Invalid price',
          'Please enter a valid price for every item.'
        );
        return;
      }
    }

    if (dueDate < new Date()) {
      Alert.alert(
        'Invalid due date',
        'Due date cannot be earlier than today.'
      );
      return;
    }

    try {
      setSavingCredit(true);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const formattedItems = items.map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

      const response = await authFetch(
        `${API_URL}/api/credits/createCredit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer: customer._id,
            items: formattedItems,
            dueDate: dueDate.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not create credit',
          data.message || 'Something went wrong.'
        );
        return;
      }

      // Schedule credit reminders
      const createdCredit = data.credit || data;

      await scheduleCreditReminders({
        creditId: createdCredit._id,
        customerName: customer.name,
        balance: createdCredit.balance,
        dueDate: createdCredit.dueDate,
      });

      Alert.alert(
        'Success',
        'Credit has been added successfully and reminders have been scheduled.'
      );

      setItems([
        {
          name: '',
          quantity: '1',
          price: '',
        },
      ]);

      setDueDate(new Date());
      setShowCreditForm(false);

      await fetchCustomerDetails();
    } catch (error) {
      console.log('Create credit error:', error);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSavingCredit(false);
    }
  };

  // -----------------------------
  // EDIT CUSTOMER
  // -----------------------------

  const handleEditCustomer = async () => {
    if (!editName.trim()) {
      Alert.alert('Missing name', 'Please enter the customer name.');
      return;
    }

    if (!editPhone.trim()) {
      Alert.alert(
        'Missing phone number',
        'Please enter the customer phone number.'
      );
      return;
    }

    try {
      setSavingCustomer(true);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/customers/updateCustomer/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName.trim(),
            phone: editPhone.trim(),
            address: editAddress.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not update customer',
          data.message || 'Something went wrong.'
        );
        return;
      }

      Alert.alert(
        'Customer updated',
        'Customer information has been updated successfully.'
      );

      setShowEditForm(false);

      await fetchCustomerDetails();
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // -----------------------------
  // DELETE CUSTOMER
  // -----------------------------

  const handleDeleteCustomer = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer?.name}? Their paid credit history will be deleted too.\n\nCustomers who still owe you money cannot be deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteCustomer,
        },
      ]
    );
  };

  // Deletes the customer; the backend refuses if they still owe money
  const confirmDeleteCustomer = async () => {
    try {
      setSavingCustomer(true);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/customers/deleteCustomer/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not delete customer',
          data.message || 'Something went wrong.'
        );
        return;
      }

      Alert.alert(
        'Customer deleted',
        'The customer has been deleted successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/customers'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading customer...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <EmptyState
          icon="person-remove-outline"
          title="Customer not found."
        />
      </View>
    );
  }

  // Total this customer still owes across all their credits
  const totalOutstanding = credits.reduce(
    (total, credit) => total + (credit.balance || 0),
    0
  );

  // Show dates as e.g. 7 Oct 2026
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // -----------------------------
  // SCREEN
  // -----------------------------

  return (
    <KeyboardScreen
      withHeader
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* CUSTOMER PROFILE */}

      <View style={styles.profileCard}>
        <View style={styles.profileRing} />

        {/* Initials, plus the edit and delete buttons */}
        <View style={styles.profileTop}>
          <Avatar name={customer.name} size={60} inverted />

          <View style={styles.profileActions}>
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setEditName(customer.name);
                setEditPhone(customer.phone);
                setEditAddress(customer.address || '');
                setShowEditForm(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit Customer"
            >
              <Ionicons name="pencil" size={17} color={colors.heroText} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
              onPress={handleDeleteCustomer}
              disabled={savingCustomer}
              accessibilityRole="button"
              accessibilityLabel="Delete Customer"
            >
              <Ionicons name="trash-outline" size={17} color="#FF9C9C" />
            </Pressable>
          </View>
        </View>

        {/* Customer's name, phone and address */}
        <Text style={styles.customerName}>{customer.name}</Text>

        <View style={styles.contactRow}>
          <Ionicons name="call" size={14} color={colors.heroSubtext} />
          <Text style={styles.customerInfo}>{customer.phone}</Text>
        </View>

        {customer.address ? (
          <View style={styles.contactRow}>
            <Ionicons name="location" size={14} color={colors.heroSubtext} />
            <Text style={styles.customerInfo}>{customer.address}</Text>
          </View>
        ) : null}

        {/* OUTSTANDING */}

        <View style={styles.outstandingBox}>
          <View>
            <Text style={styles.outstandingLabel}>Total Outstanding</Text>
            <Text style={styles.outstandingAmount}>
              ₦{totalOutstanding.toLocaleString()}
            </Text>
          </View>

          <View style={styles.creditCount}>
            <Text style={styles.creditCountValue}>{credits.length}</Text>
            <Text style={styles.creditCountLabel}>
              credit{credits.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* WHATSAPP REMINDER */}

      {totalOutstanding > 0 ? (
        <AppButton
          title="Remind on WhatsApp"
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() =>
            openWhatsApp(
              customer.phone,
              buildCustomerReminder({
                customerName: customer.name,
                senderName,
                credits,
              })
            )
          }
          style={styles.whatsappButton}
        />
      ) : null}

      {/* EDIT CUSTOMER FORM */}

      {showEditForm && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.formCard}
        >
          <Text style={styles.formTitle}>Edit Customer</Text>

          <FormField
            label="Name"
            icon="person-outline"
            placeholder="Customer name"
            value={editName}
            onChangeText={setEditName}
          />

          <FormField
            label="Phone number"
            icon="call-outline"
            placeholder="Phone number"
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
          />

          <FormField
            label="Address"
            icon="location-outline"
            placeholder="Address"
            value={editAddress}
            onChangeText={setEditAddress}
          />

          {/* Cancel or save the changes */}
          <View style={styles.formButtons}>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setShowEditForm(false)}
              disabled={savingCustomer}
              style={styles.formButton}
            />

            <AppButton
              title="Save Changes"
              onPress={handleEditCustomer}
              loading={savingCustomer}
              style={styles.formButton}
            />
          </View>
        </Animated.View>
      )}

      {/* ADD CREDIT */}

      <AppButton
        title={showCreditForm ? 'Close Credit Form' : 'New Credit'}
        icon={showCreditForm ? 'close' : 'add-circle-outline'}
        variant={showCreditForm ? 'secondary' : 'primary'}
        onPress={() => setShowCreditForm(!showCreditForm)}
        style={styles.addCreditButton}
      />

      {showCreditForm && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.formCard}
        >
          {/* Form title and icon */}
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <Ionicons name="receipt" size={18} color={colors.primary} />
            </View>

            <View style={styles.formHeaderText}>
              <Text style={styles.formTitle}>New Credit</Text>
              <Text style={styles.formSubtitle}>
                Goods {customer.name} is taking on credit
              </Text>
            </View>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>{index + 1}</Text>
                </View>

                <Text style={styles.itemTitle}>Item {index + 1}</Text>

                {items.length > 1 && (
                  <Pressable
                    onPress={() => removeItem(index)}
                    hitSlop={8}
                    style={styles.removeButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.danger}
                    />
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )}
              </View>

              <FormField
                placeholder="Item name"
                icon="cube-outline"
                value={item.name}
                onChangeText={(value) => updateItem(index, 'name', value)}
              />

              <View style={styles.itemRow}>
                <FormField
                  label="Quantity"
                  placeholder="0"
                  value={item.quantity}
                  onChangeText={(value) =>
                    updateItem(index, 'quantity', value)
                  }
                  keyboardType="numeric"
                  style={styles.itemQuantity}
                />

                <FormField
                  label="Price (₦)"
                  placeholder="0"
                  value={item.price}
                  onChangeText={(value) => updateItem(index, 'price', value)}
                  keyboardType="numeric"
                  style={styles.itemPrice}
                />
              </View>

              <View style={styles.itemTotalRow}>
                <Text style={styles.itemTotalLabel}>Item total</Text>
                <Text style={styles.itemTotal}>
                  ₦{calculateItemTotal(item).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.addItemButton,
              pressed && styles.pressed,
            ]}
            onPress={addItem}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addItemButtonText}>Add Another Item</Text>
          </Pressable>

          {/* Due date picker; past dates cannot be chosen */}
          <Text style={styles.fieldLabel}>Due date</Text>
          <Pressable
            style={({ pressed }) => [
              styles.dateButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={19}
              color={colors.primary}
            />
            <Text style={styles.dateButtonText}>
              {dueDate.toLocaleDateString('en-NG', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);

                if (selectedDate) {
                  setDueDate(selectedDate);
                }
              }}
            />
          )}

          {/* Running total of all items */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Credit Total</Text>
            <Text style={styles.totalAmount}>
              ₦{calculateCreditTotal().toLocaleString()}
            </Text>
          </View>

          <AppButton
            title="Save Credit"
            icon="checkmark"
            onPress={handleCreateCredit}
            loading={savingCredit}
          />
        </Animated.View>
      )}

      {/* CREDIT HISTORY */}

      <Text style={styles.sectionTitle}>Credit History</Text>

      {credits.length === 0 ? (
        <View style={styles.emptyCard}>
          <EmptyState
            compact
            icon="receipt-outline"
            text="No credit records yet."
          />
        </View>
      ) : (
        credits.map((credit) => {
          const overdue = isOverdue(credit);
          const total = Number(credit.totalAmount || 0);
          const paid = Math.max(0, total - Number(credit.balance || 0));
          const paidPercent =
            total > 0 ? Math.round((paid / total) * 100) : 0;

          return (
            <Pressable
              key={credit._id}
              style={({ pressed }) => [
                styles.creditCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/credits/[id]',
                  params: { id: credit._id },
                })
              }
            >
              {/* Credit date, total and status */}
              <View style={styles.creditHeader}>
                <View>
                  <Text style={styles.creditDate}>
                    {formatDate(credit.creditDate)}
                  </Text>
                  <Text style={styles.creditAmount}>
                    Total ₦{credit.totalAmount.toLocaleString()}
                  </Text>
                </View>

                <StatusBadge status={overdue ? 'Overdue' : credit.status} />
              </View>

              {/* How much of this credit has been paid */}
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${paidPercent}%` }]}
                />
              </View>

              {/* Balance and due date, shown in red when overdue */}
              <View style={styles.creditFooter}>
                <View>
                  <Text style={styles.footerLabel}>Balance</Text>
                  <Text
                    style={[
                      styles.balanceText,
                      overdue && styles.overdueText,
                    ]}
                  >
                    ₦{credit.balance.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.footerRight}>
                  <Text style={styles.footerLabel}>Due</Text>
                  <Text
                    style={[styles.dueDate, overdue && styles.overdueText]}
                  >
                    {formatDate(credit.dueDate)}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                  style={styles.viewIcon}
                />
              </View>
            </Pressable>
          );
        })
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

  loadingContainer: {
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

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  // Profile
  profileCard: {
    backgroundColor: colors.hero,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...colors.shadow,
  },

  profileRing: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 34,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  profileActions: {
    flexDirection: 'row',
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.heroSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  customerName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -0.6,
    marginBottom: 6,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  customerInfo: {
    flex: 1,
    fontSize: 14,
    color: colors.heroSubtext,
    marginLeft: 8,
  },

  outstandingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.heroSoft,
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },

  outstandingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heroSubtext,
  },

  outstandingAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -0.7,
    marginTop: 2,
  },

  creditCount: {
    alignItems: 'center',
  },

  creditCountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.heroText,
  },

  creditCountLabel: {
    fontSize: 12,
    color: colors.heroSubtext,
  },

  // Forms
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  formHeaderText: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },

  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  formButtons: {
    flexDirection: 'row',
    marginTop: 4,
  },

  formButton: {
    flex: 1,
    marginHorizontal: 4,
  },

  whatsappButton: {
    marginBottom: 12,
  },

  addCreditButton: {
    marginBottom: 16,
  },

  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    paddingBottom: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  itemNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  itemNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onPrimary,
  },

  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: 4,
  },

  itemRow: {
    flexDirection: 'row',
  },

  itemQuantity: {
    flex: 1,
    marginRight: 10,
  },

  itemPrice: {
    flex: 1.5,
  },

  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemTotalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  addItemButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 18,
  },

  addItemButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 7,
    marginLeft: 2,
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },

  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },

  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // History
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  creditCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  cardPressed: {
    opacity: 0.9,
  },

  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  creditDate: {
    fontSize: 13,
    color: colors.textMuted,
  },

  creditAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
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

  creditFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },

  footerLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },

  balanceText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  dueDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  overdueText: {
    color: colors.danger,
  },

  viewIcon: {
    marginLeft: 10,
  },
});
