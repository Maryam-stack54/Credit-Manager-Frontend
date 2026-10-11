import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Logo from './Logo';

const FOREST = '#0B3D2C';

// Green top section shared by the login and register screens
export default function AuthHeader({ title, subtitle }) {
  const insets = useSafeAreaInsets();

  // Go back, or to the welcome screen if there is nowhere to go back to
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/welcome');
    }
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <StatusBar style="light" />

      <View style={styles.ring} />
      <View style={styles.ringInner} />

      <View style={styles.topRow}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>

        <Logo size={40} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: FOREST,
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
  },

  ring: {
    position: 'absolute',
    top: -90,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 50,
    borderColor: 'rgba(111,227,168,0.08)',
  },

  ringInner: {
    position: 'absolute',
    bottom: -40,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 16,
    borderColor: 'rgba(111,227,168,0.06)',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 8,
  },
});
