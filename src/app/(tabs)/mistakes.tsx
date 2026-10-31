import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, T, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';

const FILTERS = ['전체', '아직 못 고침', '고침'] as const;

// 17 오답 도감: 저장된 말실수 그대로 (숫자 = 카드 수)
export default function Mistakes() {
  const { mistakes } = useStore();
  const ins = useSafeAreaInsets();
  const t = useT();
  const [f, setF] = useState<(typeof FILTERS)[number]>('전체');
  const fixed = mistakes.filter((m) => m.fixed).length;
  const list = mistakes.filter((m) => (f === '전체' ? true : f === '고침' ? m.fixed : !m.fixed));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 8 }}>
      <View style={{ paddingHorizontal: 24 }}>
        <T s="h1">{t('복습 노트')}</T>
        <T s="sub">{t('말실수 {n}개 · 다시 연습해서 고친 것 {m}개', { n: mistakes.length, m: fixed })}</T>
      </View>
      {mistakes.length ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 12 }}>
          {FILTERS.map((x) => (
            <Chip key={x} label={t(x)} on={f === x} onPress={() => setF(x)} />
          ))}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {!mistakes.length ? (
          <Card style={{ gap: 8 }}>
            <T s="h3">{t('아직 복습할 표현 없음')}</T>
          </Card>
        ) : null}
        {list.map((m) => (
          <Card key={m.id} onPress={() => router.push({ pathname: '/mistake/[id]', params: { id: m.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T s="label" style={{ flex: 1 }}>{t(m.title)}</T>
              {m.fixed ? <Tag label={t('고침')} tone="lime" /> : null}
              <T s="small">{t(m.when)}</T>
            </View>
            <T s="body" style={{ marginTop: 8, color: C.red, textDecorationLine: 'line-through' }}>"{m.said}"</T>
            <T s="body" style={{ marginTop: 4 }}>"{m.better}"</T>
            {!m.fixed ? <Btn label={t('다시 연습하기')} small kind="line" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => router.push({ pathname: '/mistake/[id]', params: { id: m.id } })} /> : null}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
