import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Screen, T, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { useStore } from '../../lib/store';
import { normLang, tr, UI_LANGS, UiLang } from '../../lib/i18n';

// 03 앱 표시 언어 고르기 (메뉴·버튼·힌트·피드백·결과를 이 언어로 보여 줘요)
// 설정에서 들어오면 고르고 바로 돌아가요. 학습 기록은 그대로예요.
export default function Lang() {
  const { pack, lang, set, onboarded } = useStore();
  const [sel, setSel] = useState<UiLang>(normLang(lang, pack));
  // 영어팩은 한국어 화면도 고를 수 있어요 (한국어팩은 배우는 언어라 빼요)
  const list = pack === 'en' ? [...UI_LANGS, { id: 'ko' as UiLang, name: '한국어' }] : UI_LANGS;
  const t = (ko: string) => tr(sel, ko); // 고르는 즉시 그 언어로 미리 보여 줘요
  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 8 }}>
        <T s="h1" style={{ marginTop: 8 }}>{t('앱 표시 언어')}</T>
        <T s="sub" style={{ marginBottom: 8 }}>{t('메뉴·힌트·피드백을 이 언어로 보여 줘요. 캐릭터 대사는 한국어 그대로예요.')}</T>
        {list.map((l) => {
          const on = sel === l.id;
          return (
            <Pressable key={l.id} onPress={() => setSel(l.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 62, borderRadius: 16, backgroundColor: on ? C.lime : C.white, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line }}>
              <T s="h3" style={{ flex: 1, fontSize: 16 }}>{l.name}</T>
              {on ? <Feather name="check-circle" size={22} color={C.ink} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn
          label={onboarded ? t('저장') : t('다음')}
          icon={onboarded ? 'check' : 'arrow-right'}
          onPress={() => {
            set({ lang: sel });
            if (onboarded) router.back();
            else router.push('/onboarding/character');
          }}
        />
      </View>
    </Screen>
  );
}
