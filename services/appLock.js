import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const ENABLED_KEY = 'appLockEnabled';

// Whether the user has logged in during this session, and a screen to open
// once they do (for example from tapping a payment reminder before logging in)
let unlocked = false;
let pendingRoute = null;

export const isUnlocked = () => unlocked;

export const setUnlocked = (value) => {
  unlocked = value;
};

export const setPendingRoute = (route) => {
  pendingRoute = route;
};

export const takePendingRoute = () => {
  const route = pendingRoute;
  pendingRoute = null;
  return route;
};

// Whether the "Log in with fingerprint" option is offered (More > Account)
export async function isQuickLoginEnabled() {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false';
  } catch (error) {
    return true;
  }
}

export async function setQuickLoginEnabled(enabled) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

// How this phone can confirm it is the owner. method is one of:
//   'fingerprint' | 'face' | 'iris' | 'device' (PIN, pattern or password)
//   | 'none' (no screen lock at all, so only the normal login works)
export async function getDeviceUnlockMethod() {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();

    if (level === LocalAuthentication.SecurityLevel.NONE) {
      return 'none';
    }

    if (level === LocalAuthentication.SecurityLevel.SECRET) {
      return 'device';
    }

    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();
    const { AuthenticationType } = LocalAuthentication;

    if (types.includes(AuthenticationType.FACIAL_RECOGNITION)) {
      // Inside Expo Go, iPhones refuse Face ID for our app and ask for the
      // phone passcode instead, so say so. A real build of the app uses
      // Face ID normally.
      const inExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

      return Platform.OS === 'ios' && inExpoGo ? 'device' : 'face';
    }
    if (types.includes(AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(AuthenticationType.IRIS)) return 'iris';

    return 'device';
  } catch (error) {
    return 'none';
  }
}

// Shows the phone's own fingerprint or face prompt. The phone checks the
// fingerprint or face already registered in its settings and only tells
// the app yes or no. If neither is set up, the phone asks for its PIN.
export async function confirmWithDevice() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in to Credit Manager',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    return false;
  }
}
