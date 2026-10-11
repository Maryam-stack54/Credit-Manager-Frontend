import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  REMINDER_OPTIONS,
  getReminderDays,
  setReminderDays,
} from '../../services/notificationService';

// Choose which payment reminders to receive
export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Chosen reminders, notification permission and the status message
  const [reminderDays, setReminderDaysState] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  // Load the saved choice and check notification permission
  useEffect(() => {
    getReminderDays().then(setReminderDaysState);

    Notifications.getPermissionsAsync().then(({ status }) =>
      setPermissionGranted(status === 'granted')
    );
  }, []);

  // Saves the choice and reschedules every reminder to match it
  const handleToggle = async (days, enabled) => {
    const updated = enabled
      ? [...reminderDays, days].sort((a, b) => b - a)
      : reminderDays.filter((value) => value !== days);

    setReminderDaysState(updated);
    setStatusMessage('Updating reminders...');

    const count = await setReminderDays(updated);

    if (updated.length === 0) {
      setStatusMessage('Payment reminders are turned off.');
    } else if (count === 0) {
      setStatusMessage('No upcoming due dates to remind you about yet.');
    } else {
      setStatusMessage(
        `${count} reminder${count === 1 ? '' : 's'} scheduled.`
      );
    }
  };

  // Icon for each reminder option
  const OPTION_ICONS = {
    7: 'calendar-outline',
    1: 'time-outline',
    0: 'alarm-outline',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Short explanation at the top */}
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="notifications" size={26} color={colors.primary} />
        </View>
        <Text style={styles.introText}>
          Get a notification at 9:00 AM before an unpaid credit is due, so
          you know which customers to follow up with.
        </Text>
      </View>

      {!permissionGranted ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color={colors.warningText} />

          <View style={styles.warningContent}>
            <Text style={styles.warningText}>
              Notifications are turned off for Credit Manager. Allow them in
              your phone settings to receive reminders.
            </Text>

            <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text style={styles.warningLink}>Open settings</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* One switch per reminder */}
      <Text style={styles.sectionTitle}>REMIND ME</Text>

      {reminderDays ? (
        <View style={styles.section}>
          {REMINDER_OPTIONS.map((option, index) => (
            <View
              key={option.days}
              style={[
                styles.row,
                index === REMINDER_OPTIONS.length - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name={OPTION_ICONS[option.days]}
                  size={18}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.rowLabel}>{option.label}</Text>

              <Switch
                value={reminderDays.includes(option.days)}
                onValueChange={(enabled) =>
                  handleToggle(option.days, enabled)
                }
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </View>
      ) : null}

      {statusMessage ? (
        <View style={styles.statusBox}>
          <Ionicons
            name="information-circle"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.status}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* When reminders are refreshed and when they stop */}
      <Text style={styles.footnote}>
        Reminders are refreshed each time you open the app, and stop once a
        credit is fully paid.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
  },

  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 22,
  },

  warningContent: {
    flex: 1,
    marginLeft: 10,
  },

  warningText: {
    fontSize: 14,
    color: colors.warningText,
    lineHeight: 20,
  },

  warningLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.warningText,
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  rowLast: {
    borderBottomWidth: 0,
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

  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 16,
  },

  status: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },

  footnote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
});
