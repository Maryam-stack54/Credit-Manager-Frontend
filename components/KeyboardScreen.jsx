import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

// Scrollable screen that moves up when the keyboard opens, so the field
// being typed in is never hidden. Use withHeader on screens that have a
// header bar above them.
export default function KeyboardScreen({
  children,
  withHeader = false,
  style,
  contentContainerStyle,
  ...scrollProps
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      behavior="padding"
      keyboardVerticalOffset={
        withHeader && Platform.OS === 'ios' ? insets.top + 44 : 0
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
