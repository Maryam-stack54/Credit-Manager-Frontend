import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';

// Outline icon normally, filled icon for the tab that is open
const tabIcon = (name) =>
  function TabIcon({ color, focused }) {
    return (
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={23}
        color={color}
      />
    );
  };

// The four bottom tabs: Home, Customers, Credits and More
export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        // Each tab shows its own large title instead of a header bar
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home'),
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: tabIcon('people'),
        }}
      />

      <Tabs.Screen
        name="credits"
        options={{
          title: 'Credits',
          tabBarIcon: tabIcon('receipt'),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: tabIcon('grid'),
        }}
      />
    </Tabs>
  );
}
