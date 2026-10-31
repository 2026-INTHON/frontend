import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Coin, CoinPill, IconBtn, T, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { IMG, PERSONAS, charById } from '../../lib/data';
import { useStore } from '../../lib/store';

// 09 홈 (다시 열면 오늘의 장면 · 이어하기)
export default function Home() {
  const st = useStore();
  const ins = useSafeAreaInsets();
  const streak = !st.streakClaimed; // 받으면 다시 안 떠요
  const c = charById('seoyun');
  const p = PERSONAS.seoyun[0];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
        <T s="h2" style={{ flex: 1 }}>보미님, 오늘도 한 장면만</T>
        <IconBtn name="settings" size={36} onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 8, gap: 8 }}>
        <Tag label="🔥 연속 6일" tone="white" />
        <View style={{ flex: 1 }} />
        <CoinPill />
      </View>

      {/* 오늘의 장면 */}
      <Pressable onPress={() => router.push({ pathname: '/scene/[id]', params: { id: 'seoyun-weekend' } })} style={{ flex: 1, marginHorizontal: 24, marginTop: 14, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEE6DB' }}>
        <Image source={IMG.bg.cafe} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
        <Image source={IMG.char.seoyun} style={{ position: 'absolute', top: 18, left: '38%', width: '50%', height: '100%' }} resizeMode="contain" />
        <View style={{ position: 'absolute', top: 14, left: 14 }}>
          <Tag label="이어하기" tone="lime" />
        </View>
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: C.white, borderRadius: 18, padding: 14 }}>
          <T s="small">EP 2 · 2/5 장면</T>
          <T s="h3">주말 약속 정하기</T>
          <T s="sub">{c.name} · {p.name} · 지난번에 토요일 점심까지 정했어요</T>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 12 }}>
        <Tile icon="grid" t="다른 장면" s="에피소드 목록" onPress={() => router.push('/episodes')} />
        <Tile icon="user" t="캐릭터 바꾸기" s="캐릭터 목록" onPress={() => router.push('/characters')} />
      </View>
      <View style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
        <Btn label="이어하기" icon="play" onPress={() => router.push({ pathname: '/scene/[id]', params: { id: 'seoyun-weekend' } })} />
      </View>

      {/* 20 연속 출석 축하 (데모용으로 처음 한 번 떠요) */}
      <Modal visible={streak} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: C.dim, justifyContent: 'center', padding: 28 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 28, padding: 24, alignItems: 'center', gap: 10, width: '100%', maxWidth: 360, alignSelf: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={32} color={C.ink} />
            </View>
            <T s="h1">7일 연속!</T>
            <T s="sub">일주일 동안 매일 말로 했어요</T>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
              {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="check" size={14} color={C.lime} />
                  </View>
                  <T s="small" style={{ fontSize: 10 }}>{d}</T>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: C.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Coin n="+50 코인" size={13} />
            </View>
            <Btn label="받기" style={{ alignSelf: 'stretch', marginTop: 6 }} onPress={() => { st.addCoins(50); st.set({ streakClaimed: true }); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Tile({ icon, t, s, onPress }: { icon: keyof typeof Feather.glyphMap; t: string; s: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={18} />
      </View>
      <View>
        <T s="label">{t}</T>
        <T s="small" style={{ fontSize: 11 }}>{s}</T>
      </View>
    </Card>
  );
}
