import { Tabs } from 'expo-router';
import { Platform, Text, View, StyleSheet } from 'react-native';
import { useLang, t } from '@/lib/i18n';
import { theme, radius, shadow } from '@/lib/theme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View style={[s.iconBox, focused && s.iconBoxOn]}>
      <Text style={[s.icon, focused && s.iconOn]}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const lang = useLang(s => s.lang);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: s.bar,
        tabBarItemStyle: s.item,
        tabBarActiveTintColor: theme.accentDeep,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelStyle: s.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabWeekend', lang),
          tabBarIcon: ({ focused }) => <TabIcon glyph="🗓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: t('tabPlaces', lang),
          tabBarIcon: ({ focused }) => <TabIcon glyph="📍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="visited"
        options={{
          title: t('tabVisited', lang),
          tabBarIcon: ({ focused }) => <TabIcon glyph="✓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings', lang),
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 28 : 16,
    height: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 0,
    borderRadius: radius.xl,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    ...shadow.float,
  },
  item: { paddingVertical: 0 },
  label: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  iconBox: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxOn: {
    backgroundColor: theme.accentSoft,
  },
  icon: { fontSize: 16 },
  iconOn: { fontSize: 17 },
});
