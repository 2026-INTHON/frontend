import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen, T, Tag, TopBar } from '../components/ui';
import { Paywall } from '../components/paywall';
import { C } from '../lib/theme';
import { EPISODES, IMG } from '../lib/data';
import { useStore } from '../lib/store';

// 11 에피소드 목록 (한 화면에 4개)
export default function Episodes() {
  const { subscribed } = useStore();
  const [pw, setPw] = useState(false);
  return (
    <Screen>
      <TopBar title="서윤 · 에피소드" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, marginTop: 8 }}>
        <Tag label="여자친구" tone="white" />
        <Tag label="성격 · 장난" tone="white" />
        <T s="small" style={{ marginLeft: 4 }}>무료 2개 · 구독 시 전체</T>
      </View>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 24, gap: 12 }}>
        {EPISODES.map((e) => {
          const locked = e.state === 'locked' && !subscribed;
          return (
            <Pressable
              key={e.no}
              onPress={() => (locked ? setPw(true) : router.push({ pathname: '/scene/[id]', params: { id: 'seoyun-weekend' } }))}
              style={{ width: '47.8%', backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', borderWidth: e.state === 'now' ? 2 : 0, borderColor: C.ink }}
            >
              <View style={{ height: 220, backgroundColor: C.white, overflow: 'hidden' }}>
                <Image source={IMG.char.seoyun} style={{ width: '100%', height: 330, marginTop: 14, opacity: locked ? 0.35 : 1 }} resizeMode="contain" />
                {locked ? <Feather name="lock" size={24} color={C.ink} style={{ position: 'absolute', top: 98, alignSelf: 'center' }} /> : null}
                <View style={{ position: 'absolute', top: 10, left: 10 }}>
                  <Tag label={locked ? '구독하면 열림' : e.badge} tone={e.state === 'done' ? 'dark' : e.state === 'now' ? 'lime' : 'grey'} />
                </View>
              </View>
              <View style={{ padding: 12 }}>
                <T s="small">EP {e.no}</T>
                <T s="label" style={{ fontSize: 15 }}>{e.title}</T>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Paywall visible={pw} onClose={() => setPw(false)} />
    </Screen>
  );
}
