import { Tabs } from 'expo-router';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { Text } from 'react-native';

function TabIcon({ children }: { children: string }) {
  return <Text style={{ fontSize: 18 }}>{children}</Text>;
}

export default function TabsLayout() {
  const lang = useLang(s => s.lang);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.text },
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabWeekend', lang),
          tabBarIcon: () => <TabIcon>🗓</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: t('tabPlaces', lang),
          tabBarIcon: () => <TabIcon>📍</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="visited"
        options={{
          title: t('tabVisited', lang),
          tabBarIcon: () => <TabIcon>✓</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings', lang),
          tabBarIcon: () => <TabIcon>⚙</TabIcon>,
        }}
      />
    </Tabs>
  );
}
