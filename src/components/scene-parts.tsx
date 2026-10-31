import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../lib/theme';
import { T } from './ui';

// 막대 파형 (녹음 중엔 소리 크기를 따라 움직여요)
export function Wave({ level = -40, bars = 14, color = C.ink, live = true }: { level?: number; bars?: number; color?: string; live?: boolean }) {
  const anims = useRef(Array.from({ length: bars }, () => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (!live) return;
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 260 + ((i * 53) % 200), easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(a, { toValue: 0.25, duration: 260 + ((i * 37) % 220), easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [live]);
  const gain = Math.max(0.35, Math.min(1, (level + 60) / 45));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 26 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 2, backgroundColor: color, height: a.interpolate({ inputRange: [0, 1], outputRange: [4, 24 * gain] }) }} />
      ))}
    </View>
  );
}

export function Dots() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(a, { toValue: 3, duration: 900, easing: Easing.linear, useNativeDriver: false }));
    l.start();
    return () => l.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ink, opacity: a.interpolate({ inputRange: [0, 1, 2, 3], outputRange: i === 0 ? [1, 0.3, 0.3, 1] : i === 1 ? [0.3, 1, 0.3, 0.3] : [0.3, 0.3, 1, 0.3] }) }} />
      ))}
    </View>
  );
}

// 캐릭터 대사 말풍선
export function LineCard({ name, line, action, playing, onPlay, sec = 3 }: { name: string; line: string; action?: string; playing?: boolean; onPlay?: () => void; sec?: number }) {
  return (
    <View>
      <View style={{ position: 'absolute', top: -12, left: 16, zIndex: 2, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
        <T style={{ color: C.white, fontFamily: F.b, fontSize: 12 }}>{name}</T>
      </View>
      <View style={{ backgroundColor: C.white, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 20, paddingTop: 22 }}>
        <T s="h2" style={{ fontSize: 19 }}>{line}</T>
        {action ? <T s="sub" style={{ marginTop: 6 }}>{action}</T> : null}
        {onPlay ? (
          <Pressable onPress={onPlay} style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={playing ? 'pause' : 'play'} size={12} color={C.white} />
            </View>
            <Wave bars={10} live={!!playing} />
            <T s="small">0:0{sec}</T>
            <Feather name="volume-2" size={14} color={C.sub} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Stat({ k, v, w = '45%' }: { k: string; v: string; w?: string }) {
  return (
    <View style={{ flex: 1, minWidth: w as any, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
      <T s="small">{k}</T>
      <T s="label" style={{ marginTop: 2 }}>{v}</T>
    </View>
  );
}
