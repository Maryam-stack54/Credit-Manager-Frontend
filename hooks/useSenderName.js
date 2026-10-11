import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/api';
import { authFetch } from '../services/api';

// The name WhatsApp reminders are signed with: the business name from
// More > Business details, or the owner's name if no business name is set
export default function useSenderName() {
  const [senderName, setSenderName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const response = await authFetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        setSenderName(data.user?.businessName || data.user?.name || '');
      } catch (error) {
        // Without it, the message simply starts with "Hello <name>."
      }
    };

    load();
  }, []);

  return senderName;
}
