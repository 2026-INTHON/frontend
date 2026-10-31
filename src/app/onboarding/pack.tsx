import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Screen, T } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { CHARACTERS, IMG } from '../../lib/data';
import { useStore } from '../../lib/store';

const PACKS = [
  { id: 'ko' as const, name: '한국어팩', desc: '회사 · 학교 · 친구 사이 한국어 대화', icon: 'globe' as const },
  { id: 'en' as const, name: '영어팩', desc: '카페 · 여행 · 회사에서 영어로', icon: 'briefcase' as const },
];

// 02 팩 고르기
export default function Pack() {
  const { pack, set } = useStore();
  const [sel, setSel] = useState(pack);
  return (
    <Screen>
      <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
        <T style={{ fontFamily: F.logo, fontSize: 44, lineHeight: 54 }}>Malo</T>
        <T s="sub">말실수해도 괜찮은 대화 연습장</T>
      </View>
      <View style={{ height: 220, marginHorizontal: 24, marginTop: 16, borderRadius: 20, backgroundColor: '#F8F8F9', flexDirection: 'row', alignItems: 'flex-end', overflow: 'hidden', paddingTop: 12 }}>
        {CHARACTERS.map((c) => (
          <Image key={c.id} source={IMG.char[c.id]} style={{ flex: 1, height: '100%' }} resizeMode="contain" />
        ))}
      </View>
      <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 12, flex: 1 }}>
        <T s="h2">어떤 말을 연습할까요?</T>
        {PACKS.map((p) => {
          const on = sel === p.id;
          return (
            <Pressable key={p.id} onPress={() => setSel(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 20, backgroundColor: on ? C.lime : C.white, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? C.ink : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={p.icon} size={20} color={on ? C.lime : C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T s="h3">{p.name}</T>
                <T s="sub">{p.desc}</T>
              </View>
              {on ? <Feather name="check-circle" size={24} color={C.ink} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Btn
          label="다음"
          icon="arrow-right"
          onPress={() => {
            set({ pack: sel, lang: sel === 'ko' ? 'en' : 'ko' });
            router.push('/onboarding/lang');
          }}
        />
        <T s="small" style={{ textAlign: 'center' }}>팩은 나중에 설정에서 바꿀 수 있어요</T>
      </View>
    </Screen>
  );
}
