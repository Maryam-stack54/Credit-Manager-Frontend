import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

// Shared button. Variants: primary (filled green), secondary (outlined),
// soft (light green), danger (red outline), whatsapp (WhatsApp green)
export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconRight,
  variant = 'primary',
  size = 'large',
  style,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Text colour that matches each button style
  const textColor = {
    primary: colors.onPrimary,
    secondary: colors.text,
    soft: colors.primary,
    danger: colors.danger,
    whatsapp: '#FFFFFF',
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        size === 'small' && styles.small,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : 19}
              color={textColor}
              style={styles.iconLeft}
            />
          ) : null}

          <Text
            style={[
              styles.text,
              size === 'small' && styles.textSmall,
              { color: textColor },
            ]}
          >
            {title}
          </Text>

          {iconRight ? (
            <Ionicons
              name={iconRight}
              size={size === 'small' ? 16 : 19}
              color={textColor}
              style={styles.iconRight}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  small: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  soft: {
    backgroundColor: colors.primarySoft,
  },

  danger: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.dangerBg,
  },

  whatsapp: {
    backgroundColor: '#25D366',
  },

  disabled: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  text: {
    fontSize: 16,
    fontWeight: '700',
  },

  textSmall: {
    fontSize: 14,
  },

  iconLeft: {
    marginRight: 8,
  },

  iconRight: {
    marginLeft: 8,
  },
});
