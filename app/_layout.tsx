import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useLang(s => s.hydrate);

  useEffect(() => {
    hydrate();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === 'login';
    if (!session && !inAuthGroup) router.replace('/login');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, ready, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="custom" options={{ headerShown: true, presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
