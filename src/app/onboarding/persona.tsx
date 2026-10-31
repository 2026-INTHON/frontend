import { useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Card, Chip, Screen, T, Tag, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { IMG, PERSONAS, PersonaId, charById } from '../../lib/data';
import { useStore } from '../../lib/store';
import * as haptic from '../../lib/haptics';

// 카드 자리: -1 왼쪽, 0 가운데, 1 오른쪽 (±2 는 화면 밖으로 빠지는 중)
const SLOTS = [-2, -1, 0, 1, 2];

// 05 성격 고르기: 카드 3장이 펼쳐지고, 고르면 바로 장면 시작
export default function PersonaPick() {
  const { char, persona, set } = useStore();
  const list = PERSONAS[char];
  const [sel, setSel] = useState<PersonaId>(persona);
  const c = charById(char);
  const cur = list.find((p) => p.id === sel)!;
  // 카드 순서 [왼쪽, 가운데, 오른쪽]
  const [order, setOrder] = useState<PersonaId[]>(() => {
    const o = list.filter((p) => p.id !== persona).map((p) => p.id);
    return [o[0], persona, o[1]];
  });
  const pos = useRef(Object.fromEntries(order.map((id, i) => [id, new Animated.Value(i - 1)])) as Record<PersonaId, Animated.Value>).current;
  const busy = useRef(false);

  // 옆 카드를 고르면 캐러셀처럼 옆으로 한 칸 밀려요. 반대쪽 끝 카드는 밖으로 나갔다가 반대편에서 들어와요.
  function pick(id: PersonaId) {
    const idx = order.indexOf(id);
    if (idx === 1 || busy.current) return;
    busy.current = true;
    haptic.tap();
    const dir = idx === 2 ? -1 : 1;
    const next = dir === -1 ? [order[1], order[2], order[0]] : [order[2], order[0], order[1]];
    setOrder(next);
    setSel(id);
    const ease = { duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel(
      order.map((cid, i) => {
        const from = i - 1;
        const to = from + dir;
        if (Math.abs(to) <= 1) return Animated.timing(pos[cid], { toValue: to, ...ease });
        // 끝에서 밖으로 → 반대편으로 순간 이동 → 안으로
        return Animated.sequence([
          Animated.timing(pos[cid], { toValue: to, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(pos[cid], { toValue: -to, duration: 0, useNativeDriver: true }),
          Animated.timing(pos[cid], { toValue: -to / 2, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]);
      })
    ).start(() => (busy.current = false));
  }
  return (
    <Screen>
      <TopBar />
      <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
        <T s="h1">{c.call}, 어떤 성격일까요?</T>
        <T s="sub">성격별로 다른 반응</T>
      </View>
      <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        {order.map((pid, i) => {
          const p = list.find((x) => x.id === pid)!;
          const mid = i === 1;
          const v = pos[pid];
          const tf = {
            opacity: v.interpolate({ inputRange: SLOTS, outputRange: [0, 1, 1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: SLOTS, outputRange: [-230, -118, 0, 118, 230] }) },
              { translateY: v.interpolate({ inputRange: SLOTS, outputRange: [30, 22, 0, 22, 30] }) },
              { rotate: v.interpolate({ inputRange: SLOTS, outputRange: ['-14deg', '-8deg', '0deg', '8deg', '14deg'] }) },
              { scale: v.interpolate({ inputRange: SLOTS, outputRange: [0.7, 0.8, 1, 0.8, 0.7] }) },
            ],
          };
          return (
            <AnimatedPressable
              key={pid}
              onPress={() => pick(pid)}
              style={{
                position: 'absolute',
                width: 176,
                height: 260,
                left: '50%',
                marginLeft: -88,
                top: 20,
                zIndex: mid ? 2 : 1,
                backgroundColor: C.white,
                borderRadius: 20,
                borderWidth: mid ? 2 : 1,
                borderColor: mid ? C.ink : C.line,
                overflow: 'hidden',
                ...tf,
              }}
            >
              <View style={{ height: 160, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
                <Image source={IMG.card[char]} style={{ width: '170%', height: 437, marginLeft: '-35%', marginTop: 6 }} resizeMode="cover" />
              </View>
              <View style={{ padding: 12 }}>
                <T s="h3">{p.name} <T style={{ color: C.sub }}>{'•'.repeat(p.id === 'picky' ? 3 : p.id === 'tease' ? 2 : 1)}</T></T>
                <T s="small" numberOfLines={2} style={{ marginTop: 2 }}>{p.short}</T>
              </View>
              {mid ? (
                <View style={{ position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: C.lime, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check" size={14} />
                </View>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        {list.map((p) => (
          <Chip key={p.id} label={p.name} on={p.id === sel} onPress={() => pick(p.id)} />
        ))}
      </View>
      <Card style={{ marginHorizontal: 24, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T s="h3">{cur.name} {c.role}</T>
          <Tag label={cur.level} />
        </View>
        <T s="sub" style={{ marginTop: 6 }}>{cur.long}</T>
      </Card>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 16 }}>
        <Btn
          label="이 성격으로 시작"
          icon="arrow-right"
          onPress={() => {
            set({ persona: sel, onboarded: true });
            router.replace({ pathname: '/scene/[id]', params: { id: 'today' } });
          }}
        />
      </View>
    </Screen>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
