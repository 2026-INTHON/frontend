import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen, T, Tag, TopBar } from '../components/ui';
import { Paywall } from '../components/paywall';
import { C } from '../lib/theme';
import { CHAPTERS, IMG } from '../lib/data';
import { useStore } from '../lib/store';

// 11 에피소드: 큰 챕터 → 안에 서브 챕터
export default function Episodes() {
  const { subscribed } = useStore();
  const [pw, setPw] = useState(false);
  const [open, setOpen] = useState<number>(CHAPTERS.find((c) => c.subs.some((s) => s.state === 'now'))?.no ?? 1);
  return (
    <Screen>
      <TopBar title="서윤 · 에피소드" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, marginTop: 8 }}>
        <Tag label="여자친구" tone="white" />
        <Tag label="성격 · 장난" tone="white" />
        <T s="small" style={{ marginLeft: 4 }}>무료 2챕터 · 구독 시 전체</T>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {CHAPTERS.map((ch) => {
          const locked = ch.locked && !subscribed;
          const isOpen = open === ch.no && !locked;
          const done = ch.subs.filter((s) => s.state === 'done').length;
          const now = ch.subs.some((s) => s.state === 'now');
          return (
            <View key={ch.no} style={{ backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', borderWidth: now ? 2 : 0, borderColor: C.ink }}>
              <Pressable onPress={() => (locked ? setPw(true) : setOpen(isOpen ? 0 : ch.no))} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.bg, overflow: 'hidden' }}>
                  <Image source={IMG.char.seoyun} style={{ width: 64, height: 200, marginTop: 2, opacity: locked ? 0.35 : 1 }} resizeMode="contain" />
                  {locked ? <Feather name="lock" size={18} color={C.ink} style={{ position: 'absolute', top: 22, alignSelf: 'center' }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T s="small">CHAPTER {ch.no}</T>
                  <T s="h3">{ch.title}</T>
                  <T s="small">{locked ? '구독하면 열려요' : `${ch.desc} · ${done}/${ch.subs.length}`}</T>
                </View>
                {now ? <Tag label="진행 중" tone="lime" /> : done === ch.subs.length ? <Tag label="완료" tone="dark" /> : null}
                <Feather name={locked ? 'lock' : isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.ink} />
              </Pressable>
              {isOpen ? (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                  {ch.subs.map((s) => (
                    <Pressable
                      key={s.id}
                      disabled={!s.scene}
                      onPress={() => s.scene && router.push({ pathname: '/scene/[id]', params: { id: s.scene } })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: s.state === 'now' ? C.lime : C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}
                    >
                      <T s="small" style={{ color: C.ink, width: 30 }}>{s.id}</T>
                      <T s="label" style={{ flex: 1 }}>{s.title}</T>
                      {s.state === 'done' ? <T s="label">{s.grade}</T> : null}
                      <Feather name={s.state === 'done' ? 'check' : s.state === 'now' ? 'play' : 'chevron-right'} size={16} color={C.ink} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Paywall visible={pw} onClose={() => setPw(false)} />
    </Screen>
  );
}
