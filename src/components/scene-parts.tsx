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
const CUE_ICON: Record<string, any> = { 표정: 'smile', 억양: 'trending-up', 망설임: 'more-horizontal', 침묵: 'pause', 행동: 'move' };

// 비언어 단서 칩: 표정 · 억양 · 망설임 · 침묵 · 행동
export function Cues({ cues }: { cues?: { k: string; v: string }[] }) {
  if (!cues?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {cues.map((c, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Feather name={CUE_ICON[c.k] ?? 'eye'} size={11} color={C.sub} />
          <T s="small" style={{ color: C.ink, fontSize: 12 }}>{c.k} · {c.v}</T>
        </View>
      ))}
    </View>
  );
}

// F안 · 반응 말풍선 배지: O 의도 전달 성공(라임 과녁) / △ 구체적인 설명 필요(흰 원 세모) / X 말실수(빨강) / ? 의도 불명확 다시 말해 줘
export type MarkKind = 'O' | '△' | 'X' | '?';
const MARK_NAME: Record<MarkKind, string> = { O: '의도 전달 성공', '△': '구체적인 설명 필요', X: '말실수', '?': '의도 불명확' };
export function ReactionBadge({ mark, size = 34, onPress }: { mark: MarkKind; size?: number; onPress?: () => void }) {
  const bg = mark === 'O' ? C.lime : mark === 'X' ? C.red : C.white;
  const s = size;
  const body = (
    <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: bg, borderWidth: mark === 'X' ? 0 : 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any}>
      {mark === 'O' ? (
        <View style={{ width: s * 0.42, height: s * 0.42, borderRadius: s, borderWidth: Math.max(2, s * 0.09), borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s, backgroundColor: C.ink }} />
        </View>
      ) : mark === '△' ? (
        <Feather name="triangle" size={s * 0.48} color={C.ink} />
      ) : mark === 'X' ? (
        <Feather name="x" size={s * 0.62} color={C.white} />
      ) : (
        <T style={{ fontFamily: F.k, fontSize: s * 0.5, lineHeight: s * 0.62, color: C.ink }}>?</T>
      )}
    </View>
  );
  const label = `${mark === 'O' ? 'O' : mark === '△' ? '세모' : mark === 'X' ? 'X' : '물음표'} · ${MARK_NAME[mark]}`;
  return onPress ? (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${label}, 이유 보기`}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={label}>{body}</View>
  );
}
export const markName = (m: MarkKind) => MARK_NAME[m];

export function LineCard({ name, line, sub, action, cues, playing, onPlay, sec = 3, mark, onMarkPress }: { name: string; line: string; sub?: string | null; action?: string; cues?: { k: string; v: string }[]; playing?: boolean; onPlay?: () => void; sec?: number; mark?: MarkKind | null; onMarkPress?: () => void }) {
  return (
    <View>
      {/* 반응 배지: 말풍선 오른쪽 위 모서리 */}
      {mark ? (
        <View style={{ position: 'absolute', top: -14, right: -6, zIndex: 3 }}>
          <ReactionBadge mark={mark} onPress={onMarkPress} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', top: -12, left: 16, zIndex: 2, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
        <T style={{ color: C.white, fontFamily: F.b, fontSize: 12 }}>{name}</T>
      </View>
      <View style={{ backgroundColor: C.white, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 20, paddingTop: 22 }}>
        <T s="h2" style={{ fontSize: 19 }}>{line}</T>
        {/* 선택 언어 자막 */}
        {sub ? <T s="sub" style={{ marginTop: 4, color: C.ink }}>{sub}</T> : null}
        {action ? <T s="sub" style={{ marginTop: 6 }}>{action}</T> : null}
        <Cues cues={cues} />
        {onPlay ? (
          <Pressable onPress={onPlay} accessibilityRole="button" accessibilityLabel={playing ? '대사 멈추기' : '대사 다시 듣기'} style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 }}>
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
