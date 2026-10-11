import { Platform, StyleSheet, Text, View } from 'react-native';

const FOREST = '#0B3D2C';
const MINT = '#6FE3A8';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

// The Credit Manager mark: the naira sign on a mint tile
export default function Logo({ size = 48, background = MINT, ink = FOREST }) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: background,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Credit Manager logo"
    >
      <Text
        style={[
          styles.sign,
          { fontSize: size * 0.58, lineHeight: size * 0.72, color: ink },
        ]}
      >
        ₦
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  sign: {
    fontFamily: SERIF,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
