
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/api';

const STORAGE_PREFIX = 'credit-notifications-';
const SETTING_KEY = 'reminderDays';
const REMINDER_HOUR = 9; // reminders go off at 9:00 AM
const MAX_CREDITS = 20; // iOS only keeps 64 scheduled notifications per app

const getStorageKey = (creditId) =>
  `${STORAGE_PREFIX}${creditId}`;

// The reminders a user can switch on or off in More > Payment reminders
export const REMINDER_OPTIONS = [
  {
    days: 7,
    label: '1 week before',
    title: 'Credit due soon',
    when: 'is due in 7 days',
  },
  {
    days: 1,
    label: '1 day before',
    title: 'Credit due tomorrow',
    when: 'is due tomorrow',
  },
  {
    days: 0,
    label: 'On the due date',
    title: 'Credit due today',
    when: 'is due today',
  },
];

const DEFAULT_REMINDER_DAYS = [7, 1, 0];

// Which reminders the user wants: 7 days before, 1 day before and/or on the day
export const getReminderDays = async () => {
  try {
    const saved = await AsyncStorage.getItem(SETTING_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_REMINDER_DAYS;
  } catch (error) {
    return DEFAULT_REMINDER_DAYS;
  }
};

// Short text for the More screen, e.g. 3 reminders
export const getReminderSummary = (days) => {
  if (!days || days.length === 0) return 'Off';
  if (days.length === 1) {
    return REMINDER_OPTIONS.find((option) => option.days === days[0])?.label;
  }
  return `${days.length} reminders`;
};

// Every change to scheduled reminders goes through this queue, so two
// screens updating reminders at the same time can't create duplicates.
let queue = Promise.resolve();

const runInQueue = (task) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};

// Schedules the chosen reminders for one credit at 9:00 AM
const scheduleForCredit = async (
  { creditId, customerName, balance, dueDate },
  reminderDays
) => {
  if (!creditId || !customerName || !balance || !dueDate) {
    return [];
  }

  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return [];
  }

  const now = new Date();
  const notificationIds = [];

  for (const option of REMINDER_OPTIONS) {
    if (!reminderDays.includes(option.days)) continue;

    const remindAt = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate() - option.days,
      REMINDER_HOUR
    );

    if (remindAt <= now) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: option.title,
        body: `${customerName}'s ₦${Number(
          balance
        ).toLocaleString()} credit ${option.when}.`,
        data: {
          type: 'credit-reminder',
          creditId,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
      },
    });

    notificationIds.push(id);
  }

  // Save notification IDs so they can be cancelled later.
  if (notificationIds.length > 0) {
    await AsyncStorage.setItem(
      getStorageKey(creditId),
      JSON.stringify(notificationIds)
    );
  }

  return notificationIds;
};

// Cancels the reminders saved for one credit
const cancelForCredit = async (creditId) => {
  const storedIds = await AsyncStorage.getItem(
    getStorageKey(creditId)
  );

  if (!storedIds) {
    return;
  }

  const notificationIds = JSON.parse(storedIds);

  for (const notificationId of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  }

  await AsyncStorage.removeItem(
    getStorageKey(creditId)
  );
};

// Cancels every payment reminder this app has scheduled
const cancelAll = async () => {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    if (notification.content.data?.type === 'credit-reminder') {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }
  }

  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter((key) => key.startsWith(STORAGE_PREFIX))
  );
};

// Called after a credit is created or edited
export const scheduleCreditReminders = (credit) =>
  runInQueue(async () => {
    try {
      // Replace any reminders this credit already has
      await cancelForCredit(credit.creditId);

      return await scheduleForCredit(credit, await getReminderDays());
    } catch (error) {
      console.log(
        'Could not schedule credit reminders:',
        error
      );

      return [];
    }
  });

// Called when a credit is fully paid
export const cancelCreditReminders = (creditId) =>
  runInQueue(async () => {
    try {
      if (!creditId) {
        return;
      }

      await cancelForCredit(creditId);

      console.log(
        `Cancelled reminders for credit ${creditId}`
      );
    } catch (error) {
      console.log(
        'Could not cancel credit reminders:',
        error
      );
    }
  });

// Used on log out, so one account's reminders don't stay on the phone
export const cancelAllCreditReminders = () =>
  runInQueue(async () => {
    try {
      await cancelAll();
    } catch (error) {
      console.log('Could not cancel reminders:', error);
    }
  });

// Rebuilds every reminder from the server's credits. This keeps reminders
// right on a new phone, after a reinstall, or after the settings change.
// Pass the credits list if the screen already has it.
// Resolves to the number of reminders scheduled.
export const syncReminders = (credits) =>
  runInQueue(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        return 0;
      }

      let creditList = credits;

      if (!creditList) {
        const token = await SecureStore.getItemAsync('token');

        if (!token) {
          return 0;
        }

        const response = await fetch(
          `${API_URL}/api/credits/getCredits`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          return 0;
        }

        const data = await response.json();
        creditList = data.credits || [];
      }

      await cancelAll();

      const reminderDays = await getReminderDays();

      if (reminderDays.length === 0) {
        return 0;
      }

      // Soonest due dates first, so the most urgent ones always fit
      const unpaid = creditList
        .filter((credit) => Number(credit.balance) > 0 && credit.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, MAX_CREDITS);

      let count = 0;

      for (const credit of unpaid) {
        const ids = await scheduleForCredit(
          {
            creditId: credit._id,
            customerName: credit.customer?.name || 'A customer',
            balance: credit.balance,
            dueDate: credit.dueDate,
          },
          reminderDays
        );

        count += ids.length;
      }

      return count;
    } catch (error) {
      console.log('Could not sync reminders:', error);
      return 0;
    }
  });

export const setReminderDays = async (days) => {
  await AsyncStorage.setItem(SETTING_KEY, JSON.stringify(days));
  return syncReminders();
};
