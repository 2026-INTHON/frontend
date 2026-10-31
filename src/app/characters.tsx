import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Chip, CoinPill, Screen, Sheet, T, Tag, TopBar } from '../components/ui';
import { Paywall } from '../components/paywall';
import { C } from '../lib/theme';
import { CHARACTERS, IMG, PERSONAS, CharId } from '../lib/data';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { CharacterTraitsSheet } from '../components/character-traits';

// 10 캐릭터 목록 · 카드를 누르면 그 캐릭터로 바뀌고, 꾸미기는 버튼으로
export default function Characters() {
  const st = useStore();
  const [pw, setPw] = useState(false);
  const [pick, setPick] = useState<CharId | null>(null);
  const [info, setInfo] = useState<CharId | null>(null); // ⋯ 자세한 특성
  const t = useT();
  // 고르면 바로 저장 (뒤로 가도 그대로). 성격은 지금 성격을 유지하고, 없으면 차분
  const choose = (id: CharId) => st.set({ char: id, persona: PERSONAS[id].some((p) => p.id === st.persona) ? st.persona : 'calm' });
  const personaOf = (id: CharId) => (PERSONAS[id].find((p) => p.id === (st.char === id ? st.persona : 'calm')) ?? PERSONAS[id][0]);
  const personaName = (id: CharId) => personaOf(id).name;
  const progressOf = (id: CharId) => (st.lastPlayed?.char === id ? (st.lastPlayed.status === 'done' ? t('{title} 완료', { title: st.lastPlayed.title || t('장면') }) : t('{title} 하는 중', { title: st.lastPlayed.title || t('장면') })) : null);
  return (
    <Screen>
      <TopBar title={t('캐릭터')} right={<CoinPill />} />
      <T s="sub" style={{ paddingHorizontal: 24 }}>{t('누구랑 이야기할지 고르고, 성격도 바꿀 수 있어요')}</T>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {CHARACTERS.map((c) => {
          const open = c.free || st.subscribed;
          return (
            <Pressable key={c.id} onPress={() => (open ? choose(c.id) : setPw(true))} accessibilityRole="button" accessibilityState={{ selected: st.char === c.id }} accessibilityLabel={t('{name} 고르기', { name: t(c.name) })} style={{ flexDirection: 'row', gap: 14, backgroundColor: C.white, borderRadius: 20, padding: 12, borderWidth: st.char === c.id ? 2 : 0, borderColor: C.ink }}>
              <View style={{ width: 96, height: 112, borderRadius: 14, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
                {/* 칸보다 넓은 상자에 같은 높이로 맞춰서, 가로가 넓은 그림도 얼굴 위치가 같게 */}
                <Image source={IMG.char[c.id]} style={{ width: 150, height: 290, marginLeft: -27, marginTop: 6, opacity: open ? 1 : 0.4 }} resizeMode="contain" />
                {!open ? <Feather name="lock" size={22} color={C.ink} style={{ position: 'absolute', top: 44, left: 37 }} /> : null}
              </View>
              {open ? (
                <Pressable onPress={() => setInfo(c.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('{name} 자세한 특성', { name: t(c.name) })} style={({ pressed }) => ({ position: 'absolute', top: 6, right: 6, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.bg : 'transparent', zIndex: 2 })}>
                  <Feather name="more-horizontal" size={22} color={C.ink} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', paddingRight: open ? 36 : 0 }}>
                  <T s="h3" style={{ color: open ? C.ink : C.sub }}>{t(c.name)}</T>
                  <T s="small">{t(c.role)}</T>
                </View>
                {open ? (
                  <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {st.char === c.id ? <Tag label={t('대화 중')} tone="lime" /> : null}
                      <Tag label={`${t('성격')} · ${t(personaName(c.id))}`} />
                    </View>
                    {progressOf(c.id) ? <T s="small">{progressOf(c.id)}</T> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                      <Chip label={t('꾸미기')} on onPress={() => { choose(c.id); router.push({ pathname: '/dress', params: { c: c.id } }); }} />
                      <Chip label={t('성격 바꾸기')} onPress={() => { choose(c.id); setPick(c.id); }} />
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Feather name="lock" size={12} />
                    <T s="label" style={{ fontSize: 12 }}>{t('구독하면 열림')}</T>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/persona-create')} style={{ height: 56, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <T s="label">+ {t('나만의 캐릭터 만들기')}</T>
          <T s="small">{t('구독 주 1회 · 생성권')}</T>
        </Pressable>
      </ScrollView>
      <Paywall visible={pw} onClose={() => setPw(false)} />
      <CharacterTraitsSheet char={info} persona={info ? personaOf(info).id : 'calm'} lang={st.lang} onClose={() => setInfo(null)} />
      <Sheet visible={!!pick} onClose={() => setPick(null)}>
        <T s="h2" style={{ marginBottom: 12 }}>{t('성격 바꾸기')}</T>
        {pick
          ? PERSONAS[pick].map((p) => (
              <Pressable key={p.id} onPress={() => { st.set({ char: pick, persona: p.id }); setPick(null); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <T s="h3">{t(p.name)} <T s="small">{t(p.level)}</T></T>
                <T s="sub">{t(p.short)}</T>
              </Pressable>
            ))
          : null}
        <Btn label={t('성격 직접 조정하기')} kind="line" style={{ marginTop: 14 }} onPress={() => { setPick(null); router.push('/persona-custom'); }} />
      </Sheet>
    </Screen>
  );
}
