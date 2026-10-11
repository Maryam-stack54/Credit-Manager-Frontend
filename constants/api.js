import Constants from 'expo-constants';

// Where the backend lives.
//
// Installed app (EAS Build / EAS Update): uses EXPO_PUBLIC_API_URL from
// .env.production, i.e. the backend on Render.
//
// Development (npx expo start): Expo already knows your computer's IP
// (it's how the phone loads the app), so the backend running on your
// laptop is used. No need to edit this when your network changes.
const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  `http://${host}:5000`;
