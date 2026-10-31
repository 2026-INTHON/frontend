import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Screen, T, TopBar, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { LANGS } from '../../lib/data';
import { useStore } from '../../lib/store';

// 03 모국어 고르기 (팩을 고르면 바로 이어짐)
export default function Lang() {
  const { pack, lang, set } = useStore();
  const learning = pack === 'ko' ? 'ko' : 'en';
  const [sel, setSel] = useState(lang === learning ? LANGS.find((l) => l.id !== learning)!.id : lang);
  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 8 }}>
        <View style={{ marginTop: 8 }}>
          <Tag label={pack === 'ko' ? '한국어팩' : '영어팩'} tone="white" />
        </View>
        <T s="h1" style={{ marginTop: 8 }}>모국어를 골라 주세요</T>
        <T s="sub" style={{ marginBottom: 8 }}>힌트와 피드백을 이 언어로 알려 드려요</T>
        {LANGS.map((l) => {
          const dis = l.id === learning;
          const on = sel === l.id;
          return (
            <Pressable key={l.id} disabled={dis} onPress={() => setSel(l.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 62, borderRadius: 16, backgroundColor: on ? C.lime : dis ? C.bg : C.white, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line }}>
              <View style={{ flex: 1 }}>
                <T s="h3" style={{ fontSize: 16, color: dis ? C.sub : C.ink }}>{l.name}</T>
                <T s="small">{dis ? '지금 배우는 언어예요' : l.ko}</T>
              </View>
              {on ? <Feather name="check-circle" size={22} color={C.ink} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="다음" icon="arrow-right" onPress={() => { set({ lang: sel }); router.push('/onboarding/character'); }} />
      </View>
    </Screen>
  );
}
