import { API_URL } from '../../constants/api';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { buildCreditReminder, openWhatsApp } from '../../services/whatsapp';

import {
  cancelCreditReminders,
  scheduleCreditReminders,
} from '../../services/notificationService';

// One credit: balance, items, payments, and forms to add a payment or edit it
export default function CreditDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id } = useLocalSearchParams();
  const router = useRouter();

  // The credit and its loading state
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment states
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Edit credit states
  const [showEditForm, setShowEditForm] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [editDueDate, setEditDueDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);

  // Signs WhatsApp reminders with the business name
  const senderName = useSenderName();

  // Loads the credit with its customer, items and payments
  const fetchCredit = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/credits/getCredit/${id}`,
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
          data.message || 'Could not load credit.'
        );
        return;
      }

      setCredit(data.credit || data);
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load the credit when the screen opens
  useEffect(() => {
    if (id) {
      fetchCredit();
    }
  }, [id]);

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

  // --------------------------------
  // PAYMENT
  // --------------------------------

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentNote('');
  };

  // Checks the amount, records the payment and updates the reminders
  const handleAddPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      Alert.alert(
        'Invalid amount',
        'Please enter a valid payment amount.'
      );
      return;
    }

    if (Number(paymentAmount) > credit.balance) {
      Alert.alert(
        'Payment too high',
        `The payment cannot be more than the outstanding balance of ${formatAmount(
          credit.balance
        )}.`
      );
      return;
    }

    try {
      setSavingPayment(true);

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const response = await authFetch(
        `${API_URL}/api/credits/addPayment/${id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Number(paymentAmount),
            method: paymentMethod,
            note: paymentNote.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not add payment',
          data.message || 'Something went wrong.'
        );
        return;
      }

      const updatedCredit = data.credit || data;

      // If the credit has been fully paid,
      // cancel all scheduled reminders for it.
      if (Number(updatedCredit.balance) === 0) {
        await cancelCreditReminders(updatedCredit._id || id);
      }

      Alert.alert(
        'Payment recorded',
        `${formatAmount(paymentAmount)} has been recorded.`
      );

      resetPaymentForm();
      setShowPaymentForm(false);

      await fetchCredit();
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not connect to the server.'
      );
    } finally {
      setSavingPayment(false);
    }
  };

  // --------------------------------
  // EDIT CREDIT
  // --------------------------------

  const openEditForm = () => {
    setEditItems(
      credit.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        price: String(item.price),
      }))
    );

    setEditDueDate(new Date(credit.dueDate));
    setShowEditForm(true);
  };

  // Updates one field of one item in the edit form
  const updateEditItem = (index, field, value) => {
    const updatedItems = [...editItems];

    updatedItems[index][field] = value;

    setEditItems(updatedItems);
  };

  // Adds an empty item row to the edit form
  const addEditItem = () => {
    setEditItems([
      ...editItems,
      {
        name: '',
        quantity: '1',
        price: '',
      },
    ]);
  };

  // Removes an item row from the edit form
  const removeEditItem = (index) => {
    if (editItems.length === 1) {
      Alert.alert(
        'Cannot remove item',
        'A credit must have at least one item.'
      );
      return;
    }

    setEditItems(
      editItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // Quantity times price for one item
  const calculateEditItemTotal = (item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;

    return quantity * price;
  };

  // Total of all items in the edit form
  const calculateEditTotal = () => {
    return editItems.reduce(
      (total, item) => total + calculateEditItemTotal(item),
      0
    );
  };

  // Saves the edited items and due date, then reschedules the reminders
  const handleUpdateCredit = async () => {
    for (const item of editItems) {
      if (!item.name.trim()) {
        Alert.alert(
          'Missing item name',
          'Please enter a name for every item.'
        );
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

    if (editDueDate < new Date()) {
      Alert.alert(
        'Invalid due date',
        'Due date cannot be earlier than today.'
      );
      return;
    }

    const newTotal = calculateEditTotal();

    // Amount paid so far is the total minus what is still owed
    const totalPaid =
      (credit.totalAmount || 0) -
      (credit.balance || 0);

    if (newTotal < totalPaid) {
      Alert.alert(
        'Credit total too low',
        `The new credit total cannot be less than the amount already paid (${formatAmount(
          totalPaid
        )}).`
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

      /*
       * Cancel the old reminders before updating the credit.
       *
       * This prevents reminders for the old due date
       * from remaining scheduled after the credit is edited.
       */
      await cancelCreditReminders(id);

      const formattedItems = editItems.map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

      const response = await authFetch(
        `${API_URL}/api/credits/updateCredit/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: formattedItems,
            dueDate: editDueDate.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Could not update credit',
          data.message || 'Something went wrong.'
        );

        /*
         * The old reminders were already cancelled.
         * If the backend update failed, fetch the current
         * credit again but do not create duplicate reminders.
         */
        await fetchCredit();

        return;
      }

      const updatedCredit = data.credit || data;

      /*
       * If the credit still has an outstanding balance,
       * schedule fresh reminders using the updated
       * balance and due date.
       */
      if (
        Number(updatedCredit.balance) > 0 &&
        updatedCredit.dueDate
      ) {
        await scheduleCreditReminders({
          creditId: updatedCredit._id || id,
          customerName:
            updatedCredit.customer?.name ||
            credit.customer?.name ||
            'Customer',
          balance: updatedCredit.balance,
          dueDate: updatedCredit.dueDate,
        });
      }

      Alert.alert(
        'Credit updated',
        'Credit information has been updated successfully.'
      );

      setShowEditForm(false);

      await fetchCredit();
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not connect to the server.'
      );
    } finally {
      setSavingCredit(false);
    }
  };

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.loadingText}>
          Loading credit...
        </Text>
      </View>
    );
  }

  // Shown if the credit no longer exists
  if (!credit) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState icon="receipt-outline" title="Credit not found." />
      </View>
    );
  }

  const totalPaid =
    (credit.totalAmount || 0) -
    (credit.balance || 0);

  const editTotal = calculateEditTotal();

  // Overdue when the due date has passed and money is still owed
  const overdue = isOverdue(credit);
  // Share of the total already paid, for the progress bar
  const paidPercent =
    credit.totalAmount > 0
      ? Math.round((totalPaid / credit.totalAmount) * 100)
      : 0;

  // Only offer Add Payment while money is still owed and no form is open
  const canAddPayment =
    credit.balance > 0 && !showPaymentForm && !showEditForm;

  // Payment methods the backend accepts, each with an icon
  const PAYMENT_METHODS = [
    { name: 'Cash', icon: 'cash-outline' },
    { name: 'POS', icon: 'card-outline' },
    { name: 'Bank Transfer', icon: 'swap-horizontal-outline' },
    { name: 'Other', icon: 'ellipsis-horizontal' },
  ];

  return (
    <KeyboardScreen withHeader contentContainerStyle={styles.content}>
      {/* SUMMARY */}

      <View style={styles.summaryCard}>
        <View style={styles.summaryRing} />

        {/* Customer and status */}
        <View style={styles.customerRow}>
          <Avatar
            name={credit.customer?.name || 'Unknown customer'}
            size={44}
            inverted
          />

          <View style={styles.customerText}>
            <Text style={styles.customerName} numberOfLines={1}>
              {credit.customer?.name || 'Unknown customer'}
            </Text>

            {credit.customer?.phone ? (
              <Text style={styles.customerPhone}>
                {credit.customer.phone}
              </Text>
            ) : null}
          </View>

          <StatusBadge status={overdue ? 'Overdue' : credit.status} />
        </View>

        {/* What is still owed, in large text */}
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text
          style={styles.balanceAmount}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatAmount(credit.balance)}
        </Text>

        {/* Progress bar of how much has been paid */}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${paidPercent}%` }]}
          />
        </View>

        <Text style={styles.progressText}>
          {formatAmount(totalPaid)} paid of {formatAmount(credit.totalAmount)}
        </Text>

        {/* When the credit was given and when it is due */}
        <View style={styles.datesRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Credit date</Text>
            <Text style={styles.dateValue}>
              {formatDate(credit.creditDate)}
            </Text>
          </View>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Due date</Text>
            <Text
              style={[styles.dateValue, overdue && styles.dateOverdue]}
            >
              {formatDate(credit.dueDate)}
            </Text>
          </View>
        </View>
      </View>

      {/* ACTIONS */}

      {(canAddPayment || !showEditForm) && (
        <View style={styles.actions}>
          {canAddPayment ? (
            <AppButton
              title="Add Payment"
              icon="add-circle-outline"
              onPress={() => setShowPaymentForm(true)}
              style={styles.actionButton}
            />
          ) : null}

          {!showEditForm ? (
            <AppButton
              title="Edit Credit"
              icon="create-outline"
              variant="secondary"
              onPress={openEditForm}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      )}

      {/* WHATSAPP REMINDER */}

      {credit.balance > 0 && !showEditForm && credit.customer?.phone ? (
        <AppButton
          title="Remind on WhatsApp"
          icon="logo-whatsapp"
          variant="whatsapp"
          onPress={() =>
            openWhatsApp(
              credit.customer.phone,
              buildCreditReminder({
                customerName: credit.customer.name,
                senderName,
                credit,
              })
            )
          }
          style={styles.whatsappButton}
        />
      ) : null}

      {/* PAYMENT FORM */}

      {showPaymentForm && credit.balance > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.formCard}
        >
          {/* Payment form title and the amount still owed */}
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <Ionicons name="wallet" size={18} color={colors.primary} />
            </View>

            <View style={styles.formHeaderText}>
              <Text style={styles.formTitle}>Add Payment</Text>
              <Text style={styles.formSubtitle}>
                Outstanding: {formatAmount(credit.balance)}
              </Text>
            </View>
          </View>

          <FormField
            label="Amount"
            icon="cash-outline"
            placeholder="Payment amount (₦)"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />

          {/* Cash, POS, Bank Transfer or Other */}
          <Text style={styles.fieldLabel}>Payment Method</Text>

          <View style={styles.methodContainer}>
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method.name;

              return (
                <Pressable
                  key={method.name}
                  style={[
                    styles.methodButton,
                    selected && styles.selectedMethod,
                  ]}
                  onPress={() => setPaymentMethod(method.name)}
                >
                  <Ionicons
                    name={method.icon}
                    size={16}
                    color={selected ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      selected && styles.selectedMethodText,
                    ]}
                  >
                    {method.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormField
            label="Note (optional)"
            icon="chatbubble-outline"
            placeholder="e.g. Paid at the shop"
            value={paymentNote}
            onChangeText={setPaymentNote}
            multiline
          />

          {/* Cancel or save the payment */}
          <View style={styles.formButtons}>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => {
                resetPaymentForm();
                setShowPaymentForm(false);
              }}
              style={styles.formButton}
            />

            <AppButton
              title="Save Payment"
              onPress={handleAddPayment}
              loading={savingPayment}
              style={styles.formButton}
            />
          </View>
        </Animated.View>
      )}

      {/* EDIT CREDIT FORM */}

      {showEditForm && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.formCard}
        >
          {/* Edit form title */}
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <Ionicons name="create" size={18} color={colors.primary} />
            </View>

            <View style={styles.formHeaderText}>
              <Text style={styles.formTitle}>Edit Credit</Text>
              <Text style={styles.formSubtitle}>
                Payments already made are kept
              </Text>
            </View>
          </View>

          {editItems.map((item, index) => (
            <View key={index} style={styles.editItemCard}>
              <View style={styles.editItemHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>{index + 1}</Text>
                </View>

                <Text style={styles.editItemTitle}>Item {index + 1}</Text>

                {editItems.length > 1 && (
                  <Pressable
                    onPress={() => removeEditItem(index)}
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
                onChangeText={(value) =>
                  updateEditItem(index, 'name', value)
                }
              />

              <View style={styles.itemFields}>
                <FormField
                  label="Quantity"
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={(value) =>
                    updateEditItem(index, 'quantity', value)
                  }
                  style={styles.itemQuantity}
                />

                <FormField
                  label="Price (₦)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.price}
                  onChangeText={(value) =>
                    updateEditItem(index, 'price', value)
                  }
                  style={styles.itemPrice}
                />
              </View>

              <View style={styles.editItemTotalRow}>
                <Text style={styles.editItemTotalLabel}>Item total</Text>
                <Text style={styles.editItemTotal}>
                  {formatAmount(calculateEditItemTotal(item))}
                </Text>
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.addItemButton,
              pressed && styles.pressed,
            ]}
            onPress={addEditItem}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addItemText}>Add Another Item</Text>
          </Pressable>

          {/* Due date picker; past dates cannot be chosen */}
          <Text style={styles.fieldLabel}>Due date</Text>
          <Pressable
            style={({ pressed }) => [
              styles.dateButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowEditDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={19}
              color={colors.primary}
            />
            <Text style={styles.dateButtonText}>
              {formatDate(editDueDate)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>

          {showEditDatePicker && (
            <DateTimePicker
              value={editDueDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowEditDatePicker(false);

                if (selectedDate) {
                  setEditDueDate(selectedDate);
                }
              }}
            />
          )}

          {/* New total of all items */}
          <View style={styles.editTotalRow}>
            <Text style={styles.editTotalLabel}>New Credit Total</Text>
            <Text style={styles.editTotalAmount}>
              {formatAmount(editTotal)}
            </Text>
          </View>

          {/* Cancel or save the changes */}
          <View style={styles.formButtons}>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setShowEditForm(false)}
              disabled={savingCredit}
              style={styles.formButton}
            />

            <AppButton
              title="Save Changes"
              onPress={handleUpdateCredit}
              loading={savingCredit}
              style={styles.formButton}
            />
          </View>
        </Animated.View>
      )}

      {/* ITEMS */}

      <Text style={styles.sectionTitle}>Items</Text>

      <View style={styles.card}>
        {credit.items?.map((item, index) => (
          <View
            key={`${item.name}-${index}`}
            style={[
              styles.itemRow,
              index === credit.items.length - 1
                ? styles.lastItemRow
                : null,
            ]}
          >
            <View style={styles.itemIcon}>
              <Ionicons name="cube-outline" size={17} color={colors.primary} />
            </View>

            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>

              <Text style={styles.itemDetails}>
                {item.quantity} × {formatAmount(item.price)}
              </Text>
            </View>

            <Text style={styles.itemTotal}>{formatAmount(item.total)}</Text>
          </View>
        ))}

        {/* Total of all items */}
        <View style={styles.itemsTotalRow}>
          <Text style={styles.itemsTotalLabel}>Credit Total</Text>
          <Text style={styles.itemsTotalAmount}>
            {formatAmount(credit.totalAmount)}
          </Text>
        </View>
      </View>

      {/* PAYMENT HISTORY */}

      <Text style={styles.sectionTitle}>Payment History</Text>

      {credit.payments?.length > 0 ? (
        <View style={styles.card}>
          {credit.payments.map((payment, index) => (
            <View
              key={`${payment.date}-${index}`}
              style={[
                styles.paymentRow,
                index === credit.payments.length - 1
                  ? styles.lastItemRow
                  : null,
              ]}
            >
              <View style={styles.paymentIcon}>
                <Ionicons
                  name="arrow-down"
                  size={17}
                  color={colors.successText}
                />
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.paymentAmount}>
                  {formatAmount(payment.amount)}
                </Text>

                <Text style={styles.paymentDetails} numberOfLines={2}>
                  {payment.method}
                  {payment.note ? ` · ${payment.note}` : ''}
                </Text>
              </View>

              <Text style={styles.paymentDate}>
                {formatDate(payment.date)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <EmptyState
            compact
            icon="wallet-outline"
            title="No payments yet"
            text="Payments made towards this credit will appear here."
          />
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
    padding: 24,
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.85,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.hero,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...colors.shadow,
  },

  summaryRing: {
    position: 'absolute',
    bottom: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 36,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  customerText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.heroText,
  },

  customerPhone: {
    fontSize: 13,
    color: colors.heroSubtext,
    marginTop: 2,
  },

  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heroSubtext,
  },

  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -1,
    marginTop: 2,
  },

  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.heroSoft,
    marginTop: 14,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#6FE3A8',
  },

  progressText: {
    fontSize: 13,
    color: colors.heroSubtext,
    marginTop: 8,
  },

  datesRow: {
    flexDirection: 'row',
    marginTop: 18,
  },

  dateBox: {
    flex: 1,
    backgroundColor: colors.heroSoft,
    borderRadius: 14,
    padding: 12,
    marginRight: 8,
  },

  dateLabel: {
    fontSize: 12,
    color: colors.heroSubtext,
  },

  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heroText,
    marginTop: 3,
  },

  dateOverdue: {
    color: '#FF9C9C',
  },

  // Actions
  whatsappButton: {
    marginBottom: 16,
  },

  actions: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: -4,
  },

  actionButton: {
    flex: 1,
    marginHorizontal: 4,
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
  },

  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
  },

  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },

  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    margin: 4,
  },

  selectedMethod: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },

  selectedMethodText: {
    color: colors.onPrimary,
  },

  formButtons: {
    flexDirection: 'row',
    marginTop: 4,
    marginHorizontal: -4,
  },

  formButton: {
    flex: 1,
    marginHorizontal: 4,
  },

  editItemCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    paddingBottom: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  editItemHeader: {
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

  editItemTitle: {
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

  itemFields: {
    flexDirection: 'row',
  },

  itemQuantity: {
    flex: 1,
    marginRight: 10,
  },

  itemPrice: {
    flex: 1.5,
  },

  editItemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  editItemTotalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  editItemTotal: {
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

  addItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
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

  editTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  editTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },

  editTotalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },

  // Lists
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    ...colors.shadow,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  lastItemRow: {
    borderBottomWidth: 0,
  },

  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  itemInfo: {
    flex: 1,
    marginRight: 10,
  },

  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  itemDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 14,
  },

  itemsTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  itemsTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  paymentInfo: {
    flex: 1,
    marginRight: 10,
  },

  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  paymentDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  paymentDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
