import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { setUnlocked } from '../services/appLock';

// The app always opens on the welcome screen. People who have logged in on
// this phone before can then log in with their fingerprint or face from the
// login screen, or type their details as usual.
export default function Index() {
  useEffect(() => {
    setUnlocked(false);
  }, []);

  return <Redirect href="/auth/welcome" />;
}
