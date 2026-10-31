import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Chip, CoinPill, Screen, Sheet, T, Tag, TopBar } from '../components/ui';
import { Paywall } from '../components/paywall';
import { C } from '../lib/theme';
import { CHARACTERS, IMG, PERSONAS, CharId } from '../lib/data';
import { useStore } from '../lib/store';

// 10 캐릭터 목록 · 캐릭터를 누르면 꾸미기로 이어져요
export default function Characters() {
  const st = useStore();
  const [pw, setPw] = useState(false);
  const [pick, setPick] = useState<CharId | null>(null);
  const prog: Record<string, string> = { seoyun: 'EP 2 진행 중', prof: 'EP 1 완료' };
  const cur: Record<string, string> = { seoyun: '장난', prof: '차분' };
  return (
    <Screen>
      <TopBar title="캐릭터" right={<CoinPill />} />
      <T s="sub" style={{ paddingHorizontal: 24 }}>누구랑 이야기할지 고르고, 성격도 바꿀 수 있어요</T>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {CHARACTERS.map((c) => {
          const open = c.free || st.subscribed;
          return (
            <Pressable key={c.id} onPress={() => (open ? router.push({ pathname: '/dress', params: { c: c.id } }) : setPw(true))} style={{ flexDirection: 'row', gap: 14, backgroundColor: C.white, borderRadius: 20, padding: 12, borderWidth: st.char === c.id ? 2 : 0, borderColor: C.ink }}>
              <View style={{ width: 96, height: 112, borderRadius: 14, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
                <Image source={IMG.char[c.id]} style={{ width: 96, height: 290, marginTop: 6, opacity: open ? 1 : 0.4 }} resizeMode="contain" />
                {!open ? <Feather name="lock" size={22} color={C.ink} style={{ position: 'absolute', top: 44, left: 37 }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <T s="h3" style={{ color: open ? C.ink : C.sub }}>{c.name}</T>
                  <T s="small">{c.role}</T>
                </View>
                {open ? (
                  <>
                    <Tag label={`성격 · ${cur[c.id] ?? '까탈'}`} />
                    <T s="small">{prog[c.id] ?? '새 캐릭터'}</T>
                    <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-end' }}>
                      <Chip label="꾸미기" on onPress={() => router.push({ pathname: '/dress', params: { c: c.id } })} />
                      <Chip label="성격 바꾸기" onPress={() => setPick(c.id)} />
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Feather name="lock" size={12} />
                    <T s="label" style={{ fontSize: 12 }}>구독하면 열림</T>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/persona-create')} style={{ height: 56, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <T s="label">+ 나만의 페르소나 만들기</T>
          <T s="small">구독 주 1회 · 생성권</T>
        </Pressable>
      </ScrollView>
      <Paywall visible={pw} onClose={() => setPw(false)} />
      <Sheet visible={!!pick} onClose={() => setPick(null)}>
        <T s="h2" style={{ marginBottom: 12 }}>성격 바꾸기</T>
        {pick
          ? PERSONAS[pick].map((p) => (
              <Pressable key={p.id} onPress={() => { st.set({ char: pick, persona: p.id }); setPick(null); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <T s="h3">{p.name} <T s="small">{p.level}</T></T>
                <T s="sub">{p.short}</T>
              </Pressable>
            ))
          : null}
        <Btn label="성격 직접 조정하기" kind="line" style={{ marginTop: 14 }} onPress={() => { setPick(null); router.push('/persona-custom'); }} />
      </Sheet>
    </Screen>
  );
}
