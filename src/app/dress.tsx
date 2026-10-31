import { useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, Coin, CoinPill, IconBtn, Sheet, T } from '../components/ui';
import { C, F } from '../lib/theme';
import { IMG, WARDROBE, WardrobeTab, charById, CharId, Place } from '../lib/data';
import { useStore } from '../lib/store';

// 22 꾸미기 (캐릭터 풀화면 + 아래 시트) · 24 코인 부족
export default function Dress() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  const id = (c as CharId) || 'seoyun';
  const ch = charById(id);
  const st = useStore();
  const ins = useSafeAreaInsets();
  const [tab, setTab] = useState<WardrobeTab>('옷');
  const [sel, setSel] = useState<string>(st.wearing[tab] ?? 'knit');
  const [short, setShort] = useState(false);
  const items = WARDROBE[tab] as readonly { id: string; name: string; price: number; color: string }[];
  const item = items.find((i) => i.id === sel) ?? items[0];
  const owned = st.owned.includes(item.id) || item.price === 0;
  const bgPlace = (tab === '배경' ? item.id : st.wearing['배경'] ?? 'cafe') as Place;

  function buy() {
    if (owned) {
      st.set({ wearing: { ...st.wearing, [tab]: item.id } });
      return;
    }
    if (st.coins < item.price) return setShort(true);
    st.set({ coins: st.coins - item.price, owned: [...st.owned, item.id], wearing: { ...st.wearing, [tab]: item.id } });
  }

  return (
    <ImageBackground source={IMG.bg[bgPlace]} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(238,230,219,0.3)' } as any} />
      <Image source={IMG.char[id]} style={{ position: 'absolute', top: ins.top + 70, alignSelf: 'center', width: '66%', height: '78%' }} resizeMode="contain" />
      <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="chevron-left" onPress={() => router.back()} />
        <T s="h2" style={{ flex: 1 }}>{ch.name} 꾸미기</T>
        <CoinPill />
      </View>
      <View style={{ marginLeft: 24, marginTop: 12, alignSelf: 'flex-start', backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <T style={{ color: C.white, fontFamily: F.m, fontSize: 12 }}>입어보는 중 · {item.name}</T>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: ins.bottom + 16 }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }} />
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 12 }}>
          {(Object.keys(WARDROBE) as WardrobeTab[]).map((t) => (
            <Chip key={t} label={t} on={tab === t} dark onPress={() => { setTab(t); setSel(st.wearing[t] ?? (WARDROBE[t][0] as any).id); }} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10, paddingVertical: 14 }}>
          {items.map((i) => {
            const on = i.id === sel;
            const has = st.owned.includes(i.id) || i.price === 0;
            return (
              <Pressable key={i.id} onPress={() => setSel(i.id)} style={{ width: 86, borderRadius: 14, backgroundColor: on ? C.white : C.bg, borderWidth: on ? 2 : 0, borderColor: C.ink, alignItems: 'center', paddingVertical: 12, gap: 6 }}>
                <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: i.color }} />
                <T style={{ fontFamily: F.m, fontSize: 12 }}>{i.name}</T>
                {has ? <T s="small" style={{ fontFamily: F.b }}>{st.wearing[tab] === i.id ? '착용 중' : '보유'}</T> : <Coin n={i.price} size={12} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 24 }}>
          <Btn label={owned ? (st.wearing[tab] === item.id ? '착용 중' : '입히기') : `${item.price} 코인으로 입히기`} onPress={buy} disabled={owned && st.wearing[tab] === item.id} />
        </View>
      </View>

      <Sheet visible={short} onClose={() => setShort(false)}>
        <T s="h2">코인이 모자라요</T>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <Coin n={`필요 ${item.price}`} size={13} />
          <Coin n={`보유 ${st.coins}`} size={13} />
        </View>
        <T s="label" style={{ marginTop: 18, marginBottom: 6 }}>무료로 모으기</T>
        {[['장면 하나 끝내기', '+30'], ['매일 출석', '+10'], ['오답 다시 연습하기', '+5']].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <T style={{ flex: 1 }}>{k}</T>
            <Coin n={v} size={12} />
          </View>
        ))}
        <T s="label" style={{ marginTop: 12, marginBottom: 8 }}>충전하기</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[300, '1,200원'], [1000, '3,300원'], [3000, '8,800원']].map(([n, w], i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, backgroundColor: i === 1 ? C.lime : C.bg, borderRadius: 14, paddingVertical: 12, borderWidth: i === 1 ? 2 : 0, borderColor: C.ink }}>
              <Coin n={n as number} size={13} />
              <T s="small" style={{ color: C.ink }}>{w}</T>
            </View>
          ))}
        </View>
        <Btn label="3,300원 결제하기" style={{ marginTop: 16 }} onPress={() => { st.addCoins(1000); setShort(false); }} />
      </Sheet>
    </ImageBackground>
  );
}
