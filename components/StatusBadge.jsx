import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

// Colour used for each status
const TONES = {
  Paid: 'success',
  'Partially Paid': 'warning',
  Pending: 'neutral',
  Overdue: 'danger',
};

// Coloured pill for a credit's status (Paid, Partially Paid, Pending, Overdue)
export default function StatusBadge({ status, style }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tone = TONES[status] || 'neutral';

  return (
    <View style={[styles.badge, styles[`${tone}Badge`], style]}>
      <View style={[styles.dot, styles[`${tone}Dot`]]} />
      <Text style={[styles.text, styles[`${tone}Text`]]}>{status}</Text>
    </View>
  );
}

// A credit is overdue when its due date has passed and it still has a balance
export const isOverdue = (credit) =>
  Number(credit?.balance) > 0 &&
  credit?.dueDate &&
  new Date(credit.dueDate) < new Date(new Date().toDateString());

const createStyles = (colors) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  text: {
    fontSize: 12,
    fontWeight: '700',
  },

  successBadge: { backgroundColor: colors.successBg },
  successDot: { backgroundColor: colors.successText },
  successText: { color: colors.successText },

  warningBadge: { backgroundColor: colors.warningBg },
  warningDot: { backgroundColor: colors.warningText },
  warningText: { color: colors.warningText },

  dangerBadge: { backgroundColor: colors.dangerBg },
  dangerDot: { backgroundColor: colors.dangerText },
  dangerText: { color: colors.dangerText },

  neutralBadge: { backgroundColor: colors.neutralBg },
  neutralDot: { backgroundColor: colors.neutralText },
  neutralText: { color: colors.neutralText },
});
