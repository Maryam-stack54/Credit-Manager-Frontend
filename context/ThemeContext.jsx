import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'themePreference';

// Every screen takes its colours from here, so light and dark mode
// only have to be described once.
export const palettes = {
  light: {
    background: '#F4F7F5',
    card: '#FFFFFF',
    text: '#0F1A15',
    textSecondary: '#55645C',
    textMuted: '#8A9790',
    border: '#DDE5E0',
    divider: '#EDF2EF',
    surfaceMuted: '#EEF3F0',
    placeholder: '#9AA6A0',

    // Main buttons and highlights use the brand green
    primary: '#176B4D',
    onPrimary: '#FFFFFF',
    primarySoft: '#E2F2EA',

    // The big balance cards
    hero: '#0F3D2E',
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.72)',
    heroSoft: 'rgba(255,255,255,0.12)',

    danger: '#D14343',
    successBg: '#E2F4EA',
    successText: '#1B7A4B',
    warningBg: '#FFF3D6',
    warningText: '#986200',
    dangerBg: '#FDE8E8',
    dangerText: '#B42318',
    neutralBg: '#EEF1EF',
    neutralText: '#55645C',

    brand: '#176B4D',
    onBrand: '#FFFFFF',

    // Soft shadow under cards (dark mode uses borders instead)
    shadow: {
      shadowColor: '#0F3D2E',
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },

  dark: {
    background: '#0A110E',
    card: '#131C18',
    text: '#EAF1ED',
    textSecondary: '#A6B4AC',
    textMuted: '#74837B',
    border: '#24302A',
    divider: '#1C2722',
    surfaceMuted: '#1A2420',
    placeholder: '#6A7971',

    primary: '#2E9E6B',
    onPrimary: '#FFFFFF',
    primarySoft: '#17302A',

    hero: '#134A37',
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.72)',
    heroSoft: 'rgba(255,255,255,0.10)',

    danger: '#FF6B6B',
    successBg: '#14302A',
    successText: '#6FD39E',
    warningBg: '#33290F',
    warningText: '#F2C55C',
    dangerBg: '#3A1919',
    dangerText: '#FF9393',
    neutralBg: '#1E2925',
    neutralText: '#A6B4AC',

    brand: '#2E9E6B',
    onBrand: '#FFFFFF',

    shadow: {
      shadowColor: '#000',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
  },
};

export const APPEARANCE_OPTIONS = [
  {
    value: 'system',
    label: 'System',
    description: "Match your phone's light or dark setting",
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Bright and clear, best in daylight',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easier on the eyes at night',
    icon: 'moon-outline',
  },
];

const ThemeContext = createContext(null);

// Keeps track of the chosen theme and shares its colours with every screen
export function AppThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  // 'system' | 'light' | 'dark'
  const [preference, setPreferenceState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (value) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  };

  // System follows the phone's setting; otherwise use the user's choice
  const scheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      scheme,
      isDark: scheme === 'dark',
      colors: palettes[scheme],
    }),
    [preference, scheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Lets any screen read the current colours
export function useAppTheme() {
  return useContext(ThemeContext);
}
