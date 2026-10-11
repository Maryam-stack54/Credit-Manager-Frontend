import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  APPEARANCE_OPTIONS,
  palettes,
  useAppTheme,
} from '../../context/ThemeContext';
import OptionList from '../../components/OptionList';

// A tiny drawing of the app in light or dark colours
function ThemePreview({ scheme, active, onPress, styles }) {
  const palette = palettes[scheme];

  return (
    <Pressable style={styles.previewWrap} onPress={onPress}>
      <View
        style={[
          styles.preview,
          { backgroundColor: palette.background },
          active && styles.previewActive,
        ]}
      >
        <View style={[styles.previewHero, { backgroundColor: palette.hero }]}>
          <View style={styles.previewHeroLine} />
          <View style={styles.previewHeroAmount} />
        </View>

        {[0, 1].map((row) => (
          <View
            key={row}
            style={[styles.previewRow, { backgroundColor: palette.card }]}
          >
            <View
              style={[
                styles.previewAvatar,
                { backgroundColor: palette.primarySoft },
              ]}
            />
            <View
              style={[
                styles.previewLine,
                { backgroundColor: palette.divider },
              ]}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.previewLabel, active && styles.previewLabelActive]}>
        {scheme === 'light' ? 'Light' : 'Dark'}
      </Text>
    </Pressable>
  );
}

// Choose light, dark or the phone's own setting
export default function AppearanceScreen() {
  const { colors, preference, scheme, setPreference } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tap a preview to switch theme */}
      <View style={styles.previews}>
        {['light', 'dark'].map((item) => (
          <ThemePreview
            key={item}
            scheme={item}
            active={scheme === item}
            onPress={() => setPreference(item)}
            styles={styles}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>THEME</Text>

      {/* System, Light or Dark */}
      <OptionList
        options={APPEARANCE_OPTIONS}
        selected={preference}
        onSelect={setPreference}
      />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
  },

  previews: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  previewWrap: {
    width: '47%',
    alignItems: 'center',
  },

  preview: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 20,
    padding: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },

  previewActive: {
    borderColor: colors.primary,
    borderWidth: 3,
  },

  previewHero: {
    height: '38%',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },

  previewHeroLine: {
    width: '45%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
  },

  previewHeroAmount: {
    width: '70%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },

  previewAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },

  previewLine: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },

  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },

  previewLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
});
