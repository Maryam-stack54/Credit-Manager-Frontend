import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

// Labelled text input with an optional icon. Password fields get an eye
// button so people can check what they typed.
export default function FormField({
  label,
  icon,
  secure = false,
  hint,
  multiline = false,
  editable = true,
  style,
  ...inputProps
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Highlight the field while typing, and hide passwords until the eye is tapped
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputWrapFocused,
          !editable && styles.inputWrapDisabled,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.textMuted}
            style={[styles.icon, multiline && styles.iconMultiline]}
          />
        ) : null}

        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secure && hidden}
          multiline={multiline}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />

        {secure ? (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 7,
    marginLeft: 2,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },

  inputWrapMultiline: {
    alignItems: 'flex-start',
    minHeight: 96,
    paddingVertical: 12,
  },

  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },

  inputWrapDisabled: {
    backgroundColor: colors.surfaceMuted,
  },

  icon: {
    marginRight: 10,
  },

  iconMultiline: {
    marginTop: 2,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },

  inputMultiline: {
    paddingVertical: 0,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  eye: {
    marginLeft: 8,
    padding: 2,
  },

  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginLeft: 2,
  },
});
