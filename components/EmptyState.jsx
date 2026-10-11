import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

// Friendly message shown when a list has nothing in it yet
export default function EmptyState({ icon, title, text, compact = false }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
        <Ionicons
          name={icon}
          size={compact ? 20 : 28}
          color={colors.primary}
        />
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },

  compact: {
    paddingVertical: 18,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  iconCircleCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 10,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },

  text: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
