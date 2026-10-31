import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Screen, T, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { useStore } from '../../lib/store';
import { normLang, useT } from '../../lib/i18n';

const PACKS = [
  { id: 'ko' as const, name: '한국어팩', desc: '회사 · 학교 · 친구 사이 한국어 대화', icon: 'globe' as const },
  { id: 'en' as const, name: '영어팩', desc: '카페 · 여행 · 회사에서 영어로', icon: 'briefcase' as const },
];


// 02 팩 고르기

export default function Pack() {
  const { pack, lang, set } = useStore();
  const t = useT();
  const [sel, setSel] = useState(pack);
  return (
    <Screen>
      <TopBar />
      {/* 작은 화면에서도 선택지가 버튼에 가리지 않게 본문만 스크롤 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12 }}>
        <T s="h1">{t('어떤 언어를 연습할까요?')}</T>
        {PACKS.map((p) => {
          const on = sel === p.id;
          return (
            <Pressable key={p.id} onPress={() => setSel(p.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 20, backgroundColor: on ? C.lime : C.white, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? C.ink : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={p.icon} size={20} color={on ? C.lime : C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T s="h3">{t(p.name)}</T>
                <T s="sub">{t(p.desc)}</T>
              </View>
              {on ? <Feather name="check-circle" size={24} color={C.ink} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
        <Btn
          label={t('다음')}
          icon="arrow-right"
          onPress={() => {
            set({ pack: sel, lang: normLang(lang, sel) });
            router.push('/onboarding/lang');
          }}
        />
        <T s="small" style={{ textAlign: 'center' }}>{t('팩은 나중에 설정에서 바꿀 수 있어요')}</T>
      </View>
    </Screen>
  );
}
