import * as SecureStore from 'expo-secure-store';

// What kind of person is logged in: 'owner', 'staff' or 'admin'.
// It is saved next to the login token. The server checks the real role on
// every request, so this only decides which screens and buttons to show.
// A phone that logged in before roles existed belongs to a shop owner.
export async function saveRole(role) {
  await SecureStore.setItemAsync('role', role || 'owner');
}

export async function getRole() {
  return (await SecureStore.getItemAsync('role')) || 'owner';
}

export async function clearRole() {
  await SecureStore.deleteItemAsync('role');
}

// The first screen each kind of person sees after logging in
export function homeRouteFor(role) {
  if (role === 'admin') return '/admin';
  // Staff have no dashboard, so they start on the customer list
  if (role === 'staff') return '/(tabs)/customers';
  return '/(tabs)/dashboard';
}
