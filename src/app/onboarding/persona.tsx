import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Card, Chip, Screen, T, Tag, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { IMG, PERSONAS, PersonaId, charById, sceneForChar } from '../../lib/data';
import { useStore } from '../../lib/store';

// 05 성격 고르기: 카드 3장이 펼쳐지고, 고르면 바로 장면 시작
export default function PersonaPick() {
  const { char, persona, set } = useStore();
  const list = PERSONAS[char];
  const [sel, setSel] = useState<PersonaId>(persona);
  const c = charById(char);
  const others = list.filter((p) => p.id !== sel);
  const order = [others[0], list.find((p) => p.id === sel)!, others[1]];
  const cur = list.find((p) => p.id === sel)!;
  return (
    <Screen>
      <TopBar />
      <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
        <T s="h1">{c.call}, 어떤 성격일까요?</T>
        <T s="sub">성격에 따라 반응과 난이도가 달라져요</T>
      </View>
      <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        {order.map((p, i) => {
          const mid = i === 1;
          return (
            <Pressable
              key={p.id + i}
              onPress={() => setSel(p.id)}
              style={{
                position: 'absolute',
                width: mid ? 176 : 140,
                height: mid ? 260 : 210,
                left: mid ? undefined : i === 0 ? 16 : undefined,
                right: i === 2 ? 16 : undefined,
                zIndex: mid ? 2 : 1,
                transform: [{ rotate: mid ? '0deg' : i === 0 ? '-8deg' : '8deg' }],
                backgroundColor: C.white,
                borderRadius: 20,
                borderWidth: mid ? 2 : 1,
                borderColor: mid ? C.ink : C.line,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: mid ? 160 : 126, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
                <Image source={IMG.card[char]} style={{ width: '170%', height: mid ? 437 : 351, marginLeft: '-35%', marginTop: 6 }} resizeMode="cover" />
              </View>
              <View style={{ padding: 12 }}>
                <T s="h3">{p.name} <T style={{ color: C.sub }}>{'•'.repeat(p.id === 'picky' ? 3 : p.id === 'tease' ? 2 : 1)}</T></T>
                <T s="small" numberOfLines={2} style={{ marginTop: 2 }}>{p.short}</T>
              </View>
              {mid ? (
                <View style={{ position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: C.lime, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check" size={14} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        {list.map((p) => (
          <Chip key={p.id} label={p.name} on={p.id === sel} onPress={() => setSel(p.id)} />
        ))}
      </View>
      <Card style={{ marginHorizontal: 24, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T s="h3">{cur.name} {c.role}</T>
          <Tag label={cur.level} />
        </View>
        <T s="sub" style={{ marginTop: 6 }}>{cur.long}</T>
      </Card>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 16 }}>
        <Btn
          label="이 성격으로 시작"
          icon="arrow-right"
          onPress={() => {
            set({ persona: sel, onboarded: true });
            router.replace({ pathname: '/scene/[id]', params: { id: sceneForChar(char).id } });
          }}
        />
      </View>
    </Screen>
  );
}
