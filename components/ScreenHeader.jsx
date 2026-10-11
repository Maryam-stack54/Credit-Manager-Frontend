import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

// How far the first card on each tab slides up over the green band
export const HEADER_OVERLAP = 34;

// Forest-green band with the page title, used at the top of each tab.
// Wrap the content that follows in a view with marginTop: -HEADER_OVERLAP
// so the first card overlaps the band.
export default function ScreenHeader({ title, subtitle, description, right }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Light status bar icons on the dark green band, back to normal when
  // another screen is opened on top
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  return (
    <View style={[styles.band, { paddingTop: insets.top + 14 }]}>
      <View style={styles.ring} />

      <View style={styles.row}>
        <View style={styles.textContainer}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  band: {
    backgroundColor: colors.hero,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 26 + HEADER_OVERLAP,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  ring: {
    position: 'absolute',
    top: -120,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 50,
    borderColor: 'rgba(111,227,168,0.07)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  textContainer: {
    flex: 1,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.heroSubtext,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -0.5,
  },

  description: {
    fontSize: 14,
    color: colors.heroSubtext,
    marginTop: 4,
  },

  right: {
    marginLeft: 12,
  },
});
