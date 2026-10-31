import { View, Image } from 'react-native';
import { router } from 'expo-router';
import { Btn, Screen, T } from '../components/ui';
import { C, F } from '../lib/theme';
import { IMG, CHARACTERS } from '../lib/data';
import { useStore } from '../lib/store';

// 01 웰컴
export default function Welcome() {
  const { set } = useStore();
  return (
    <Screen bg={C.white}>
      <View style={{ paddingHorizontal: 24, marginTop: 40 }}>
        <T s="h2">어서오세요!</T>
        <T style={{ fontFamily: F.logo, fontSize: 64, lineHeight: 76, marginTop: 4 }}>Malo</T>
        <T s="sub">말로 하는 연습, 말로에서 시작해요</T>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 8, marginVertical: 16 }}>
        {CHARACTERS.map((c) => (
          <Image key={c.id} source={IMG.char[c.id]} style={{ flex: 1, height: '92%' }} resizeMode="contain" />
        ))}
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Btn label="시작하기" icon="arrow-right" onPress={() => router.push('/onboarding/pack')} />
        <Btn
          label="이미 계정이 있어요"
          kind="ghost"
          small
          onPress={() => {
            set({ onboarded: true, char: 'seoyun', persona: 'tease' });
            router.replace('/home');
          }}
        />
      </View>
    </Screen>
  );
}
