import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Screen, T, TopBar, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { LANGS } from '../../lib/data';
import { learningCopy } from '../../lib/learning-copy';
import { useStore } from '../../lib/store';

const FLAGS: Record<string, number> = { ko: require('../../../assets/flags/ko.png'), ja: require('../../../assets/flags/ja.png'), en: require('../../../assets/flags/en.png'), zh: require('../../../assets/flags/zh.png') };

export default function Lang() {
  const { lang, onboarded, set } = useStore();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [sel, setSel] = useState(lang);
  const copy = learningCopy(sel);
  return (
    <Screen>
      <TopBar />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}>
        <Tag label={copy.koreanPractice} tone="white" />
        <T s="h1" style={{ marginTop: 8 }}>{copy.chooseLanguage}</T>
        <T s="sub" style={{ marginBottom: 12 }}>{copy.languageHelp}</T>
        {LANGS.map(l => {
          const on = sel === l.id;
          return (
            <Pressable key={l.id} onPress={() => setSel(l.id)} accessibilityRole="radio" accessibilityLabel={l.name} accessibilityState={{ checked: on }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, minHeight: 74, borderRadius: 16, backgroundColor: on ? C.lime : C.white, borderWidth: 2, borderColor: on ? C.ink : C.line, opacity: pressed ? .8 : 1 })}>
              <Image source={FLAGS[l.id]} style={{ width: 36, height: 36 }} resizeMode="contain" accessible={false} />
              <T s="h3" style={{ flex: 1 }}>{l.name}</T>
              {on ? <Feather name="check-circle" size={22} color={C.ink} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Btn label={returnTo === 'settings' ? copy.save : copy.next} icon="arrow-right" onPress={() => {
          set({ lang: sel, languageSelected: true, pack: 'ko' });
          if (returnTo === 'settings') router.replace('/settings');
          else if (onboarded) router.replace('/home');
          else router.push('/onboarding/character');
        }} />
      </View>
    </Screen>
  );
}
