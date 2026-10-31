import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle, Modal, Image, Animated, Easing } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R } from '../lib/theme';
import { useStore } from '../lib/store';

export function T({ children, s, style, ...rest }: { children: React.ReactNode; s?: keyof typeof ts; style?: TextStyle | TextStyle[]; numberOfLines?: number }) {
  return (
    <Text style={[ts.base, s ? ts[s] : null, style as TextStyle]} {...rest}>
      {children}
    </Text>
  );
}
const ts = StyleSheet.create({
  base: { fontFamily: F.r, fontSize: 14, color: C.ink },
  h1: { fontFamily: F.b, fontSize: 24, lineHeight: 32 },
  h2: { fontFamily: F.b, fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: F.b, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  sub: { fontFamily: F.r, fontSize: 13, lineHeight: 19, color: C.sub },
  small: { fontFamily: F.m, fontSize: 12, color: C.sub },
  label: { fontFamily: F.b, fontSize: 13 },
});

type BtnProps = { label: string; onPress?: () => void; icon?: keyof typeof Feather.glyphMap; kind?: 'dark' | 'lime' | 'line' | 'ghost'; style?: ViewStyle; disabled?: boolean; small?: boolean };
export function Btn({ label, onPress, icon, kind = 'dark', style, disabled, small }: BtnProps) {
  const bg = kind === 'dark' ? C.ink : kind === 'lime' ? C.lime : kind === 'line' ? C.white : 'transparent';
  const fg = kind === 'dark' ? C.white : C.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        { height: small ? 44 : 56, borderRadius: R.btn, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        kind === 'line' && { borderWidth: 1, borderColor: C.line },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.b, fontSize: small ? 14 : 16, color: fg }}>{label}</Text>
      {icon ? <Feather name={icon} size={18} color={kind === 'dark' ? C.lime : C.ink} /> : null}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style, dark }: { label: string; on?: boolean; onPress?: () => void; style?: ViewStyle; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={[{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: R.pill, backgroundColor: on ? C.ink : dark ? C.bg : C.white, borderWidth: on ? 0 : 1, borderColor: C.line }, style]}>
      <Text style={{ fontFamily: on ? F.b : F.m, fontSize: 13, color: on ? C.white : C.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = 'grey' }: { label: string; tone?: 'grey' | 'lime' | 'dark' | 'red' | 'white' }) {
  const bg = { grey: C.bg, lime: C.lime, dark: C.ink, red: C.red, white: C.white }[tone];
  const fg = tone === 'dark' || tone === 'red' ? C.white : C.ink;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: bg }}>
      <Text style={{ fontFamily: F.b, fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}

export function Screen({ children, bg = C.bg, style, pad = true }: { children: React.ReactNode; bg?: string; style?: ViewStyle; pad?: boolean }) {
  const ins = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: bg, paddingTop: Math.max(ins.top, 12) + 12, paddingBottom: pad ? ins.bottom + 12 : 0 }, style]}>{children}</View>;
}

export function IconBtn({ name, onPress, bg = C.white, color = C.ink, size = 40, label }: { name: keyof typeof Feather.glyphMap; onPress?: () => void; bg?: string; color?: string; size?: number; label?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label ?? ICON_LABEL[name] ?? name} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={size * 0.45} color={color} />
    </Pressable>
  );
}

// 아이콘만 있는 버튼의 읽기용 이름 (스크린리더)
const ICON_LABEL: Partial<Record<string, string>> = { 'chevron-left': '뒤로', settings: '설정', clock: '대화 내역', 'log-out': '나가기', pause: '일시정지', mic: '말하기', send: '보내기', x: '닫기' };

export function Coin({ n, size = 14 }: { n?: number | string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: size + 2, height: size + 2, borderRadius: 99, backgroundColor: C.lime, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.k, fontSize: size * 0.6, color: C.ink, lineHeight: size * 0.8 }}>M</Text>
      </View>
      {n != null ? <Text style={{ fontFamily: F.b, fontSize: size }}>{typeof n === 'number' ? n.toLocaleString() : n}</Text> : null}
    </View>
  );
}

export function CoinPill() {
  const { coins } = useStore();
  return (
    <View style={{ backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Coin n={coins} />
    </View>
  );
}

export function TopBar({ title, right, onBack }: { title?: string; right?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, height: 48, gap: 12 }}>
      <IconBtn name="chevron-left" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')))} />
      {title ? <T s="h2" style={{ flex: 1 }}>{title}</T> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const st = [{ backgroundColor: C.white, borderRadius: R.card, padding: 16 }, style as ViewStyle];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [...st, { opacity: pressed ? 0.9 : 1 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={st}>{children}</View>
  );
}

// 아래에서 올라오는 시트. 뒤 배경은 슬라이드 없이 살짝만 흐려지고(dim=false 면 그대로), 시트만 올라와요.
export function Sheet({ visible, onClose, children, dim = true }: { visible: boolean; onClose: () => void; children: React.ReactNode; dim?: boolean }) {
  const ins = useSafeAreaInsets();
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* PC 웹에서도 폰 화면(430) 안에서만 어두워지고 올라와요 */}
      <View style={FRAME}>
        <AnimatedPressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: dim ? 'rgba(17,17,17,0.28)' : 'transparent', opacity: a }} onPress={onClose} />
        <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: ins.bottom + 20, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 12, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }] }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.line, marginTop: -12, marginBottom: 16 }} />
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// 모달 안쪽 틀: 폰 화면 폭에 맞추고 밖으로 삐져나오지 않게
export const FRAME = { flex: 1, width: '100%' as const, maxWidth: 430, alignSelf: 'center' as const, overflow: 'hidden' as const };

export function Hearts({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <View accessible accessibilityLabel={`체력 ${n}/${max}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 8 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Ionicons key={i} name="heart" size={15} color={i < n ? C.ink : C.line} />
      ))}
    </View>
  );
}

export function Avatar({ src, size = 64 }: { src: any; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 16, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
      <Image source={src} style={{ width: size * 1.6, height: size * 2.4, marginLeft: -size * 0.3, marginTop: -size * 0.08 }} resizeMode="cover" />
    </View>
  );
}
