import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../../components/Logo';

// The welcome screen always uses the brand colours, in light and dark mode
const FOREST = '#0B3D2C';
const MINT = '#6FE3A8';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

// First screen for new and returning users
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <StatusBar style="light" />

      {/* Decorative rings, the same as on the login and register screens */}
      <View style={styles.ring} />
      <View style={styles.ringInner} />

      {/* Brand */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.brand}>
        <Logo size={44} />
        <Text style={styles.brandName}>Credit Manager</Text>
      </Animated.View>

      {/* Message */}
      <Animated.View
        entering={FadeIn.delay(200).duration(800)}
        style={styles.message}
      >
        {/* Main message, in a serif font */}
        <Text style={styles.headline}>
          Every naira{'\n'}owed to you,{'\n'}in one place.
        </Text>

        {/* Short mint line between the headline and the subtitle */}
        <View style={styles.rule} />

        <Text style={styles.subtitle}>
          Record it. Track it. Collect it.
        </Text>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeIn.delay(400).duration(800)}>
        {/* Get started opens the sign-up screen */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>

        {/* Existing users go to the login screen */}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressedText,
          ]}
          onPress={() => router.push('/auth/login')}
          hitSlop={8}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FOREST,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },

  ring: {
    position: 'absolute',
    top: -110,
    right: -130,
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 56,
    borderColor: 'rgba(111,227,168,0.08)',
  },

  ringInner: {
    position: 'absolute',
    top: 250,
    right: 36,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 16,
    borderColor: 'rgba(111,227,168,0.06)',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandName: {
    fontFamily: SERIF,
    fontSize: 21,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginLeft: 12,
  },

  message: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 48,
  },

  headline: {
    fontFamily: SERIF,
    fontSize: 44,
    lineHeight: 52,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  rule: {
    width: 40,
    height: 2,
    backgroundColor: MINT,
    marginTop: 28,
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.68)',
    maxWidth: 300,
  },

  primaryButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: FOREST,
  },

  secondaryButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  pressed: {
    opacity: 0.9,
  },

  pressedText: {
    opacity: 0.6,
  },
});
