import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

// First letters of the first two names, e.g. Maryam Musa becomes MM
export const getInitials = (name) => {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

// Round badge with a person's initials
export default function Avatar({ name, size = 44, inverted = false }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.avatar,
        inverted && styles.avatarInverted,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text
        style={[
          styles.initials,
          inverted && styles.initialsInverted,
          { fontSize: size * 0.38 },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  avatar: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarInverted: {
    backgroundColor: colors.heroSoft,
  },

  initials: {
    fontWeight: '700',
    color: colors.primary,
  },

  initialsInverted: {
    color: colors.heroText,
  },
});
