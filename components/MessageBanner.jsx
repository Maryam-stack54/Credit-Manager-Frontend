import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

// Success or error message shown under a form
export default function MessageBanner({ type = 'error', message, style }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <View
      style={[styles.banner, isError ? styles.error : styles.success, style]}
    >
      <Ionicons
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={19}
        color={isError ? colors.dangerText : colors.successText}
      />
      <Text
        style={[
          styles.text,
          { color: isError ? colors.dangerText : colors.successText },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  error: {
    backgroundColor: colors.dangerBg,
  },

  success: {
    backgroundColor: colors.successBg,
  },

  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
});
