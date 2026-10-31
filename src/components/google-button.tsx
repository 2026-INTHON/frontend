import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './ui';
import { C } from '../lib/theme';

// Google 로 계속하기 (준비 중이면 비활성)
export function GoogleButton({ onPress, busy, disabled, label = 'Google로 계속하기' }: { onPress: () => void; busy?: boolean; disabled?: boolean; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.white, opacity: disabled ? 0.45 : 1 }}
    >
      {busy ? <ActivityIndicator color={C.ink} /> : <Ionicons name="logo-google" size={18} color={C.ink} />}
      <T s="label" style={{ fontSize: 15 }}>{disabled ? 'Google 로그인 준비 중' : label}</T>
      <View />
    </Pressable>
  );
}
