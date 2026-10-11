import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

// A list of choices with a radio circle next to each one
export default function OptionList({ options, selected, onSelect }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      {options.map((option, index) => {
        // The selected option gets a filled circle and a green icon
        const isSelected = selected === option.value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.row,
              index === options.length - 1 && styles.rowLast,
              pressed && styles.pressed,
            ]}
            onPress={() => onSelect(option.value)}
          >
            {option.icon ? (
              <View
                style={[styles.iconBox, isSelected && styles.iconBoxSelected]}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={isSelected ? colors.onPrimary : colors.primary}
                />
              </View>
            ) : null}

            <View style={styles.textContainer}>
              <Text style={styles.label}>{option.label}</Text>
              {option.description ? (
                <Text style={styles.description}>{option.description}</Text>
              ) : null}
            </View>

            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  pressed: {
    backgroundColor: colors.surfaceMuted,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  iconBoxSelected: {
    backgroundColor: colors.primary,
  },

  textContainer: {
    flex: 1,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
