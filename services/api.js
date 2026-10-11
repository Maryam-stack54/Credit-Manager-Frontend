import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { cancelAllCreditReminders } from './notificationService';
import { setUnlocked } from './appLock';

let handlingExpiry = false;

// Logs the user out and sends them to the login screen. Runs once even if
// several requests fail at the same time.
export async function endSession(message) {
  if (handlingExpiry) return;
  handlingExpiry = true;

  setUnlocked(false);

  try {
    await cancelAllCreditReminders();
    await SecureStore.deleteItemAsync('token');
  } finally {
    router.replace('/auth/login');

    if (message) {
      Alert.alert('Please log in again', message);
    }

    // Allow the next expiry to be handled after this one has finished
    setTimeout(() => {
      handlingExpiry = false;
    }, 1500);
  }
}

// Same as fetch, but if the server says the login token is no longer valid
// (for example it expired after 7 days), the user is logged out and sent to
// the login screen instead of seeing errors on every screen.
export async function authFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401 && options.headers?.Authorization) {
    endSession('Your session has expired. Log in to continue.');
  }

  return response;
}
