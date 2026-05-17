import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { theme, shadow, radius } from '@/lib/theme';

export function ErrorBanner() {
  const error = useStore(s => s.error);
  const clearError = useStore(s => s.clearError);
  if (!error) return null;
  return (
    <SafeAreaView edges={['top']} style={s.wrap} pointerEvents="box-none">
      <View style={s.banner}>
        <Text style={s.icon}>⚠️</Text>
        <Text style={s.message} numberOfLines={3}>
          {error}
        </Text>
        <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={s.close}>×</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff0f0',
    borderColor: theme.bad,
    borderWidth: 1,
    borderRadius: radius.md,
    ...shadow.md,
  },
  icon: { fontSize: 16 },
  message: { flex: 1, fontSize: 12, color: theme.badInk, fontWeight: '600', lineHeight: 17 },
  close: { fontSize: 22, color: theme.badInk, fontWeight: '300', paddingHorizontal: 4 },
});
