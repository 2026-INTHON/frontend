import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Screen, T, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { CHARACTERS, IMG, CharId } from '../../lib/data';
import { useStore } from '../../lib/store';

// 04 캐릭터 고르기
export default function Character() {
  const { char, set } = useStore();
  const [sel, setSel] = useState<CharId>(char);
  return (
    <Screen>
      <TopBar />
      <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
        <T s="h1">누구랑 이야기할까요?</T>
        <T s="sub">상대에 따라 말투가 달라져요</T>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
        {(['seoyun', 'junho', 'boss', 'prof'] as CharId[]).map((id) => {
          const c = CHARACTERS.find((x) => x.id === id)!;
          const on = sel === id;
          return (
            <Pressable key={id} onPress={() => setSel(id)} style={{ width: '47.5%', height: '47%', borderRadius: 20, backgroundColor: '#F8F8F9', overflow: 'hidden', borderWidth: on ? 2.5 : 0, borderColor: C.ink }}>
              <Image source={IMG.card[id]} style={{ position: 'absolute', top: 6, left: 0, right: 0, height: '120%', width: '100%' }} resizeMode="contain" />
              <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <T s="label">{c.role}</T>
                <T s="small" style={{ fontSize: 11 }}>{c.name}</T>
              </View>
              {on ? (
                <View style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: C.lime, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check" size={16} color={C.ink} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="다음" icon="arrow-right" onPress={() => { set({ char: sel }); router.push('/onboarding/persona'); }} />
      </View>
    </Screen>
  );
}
