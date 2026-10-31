import { View } from 'react-native';
import { Btn, Sheet, T, Tag } from './ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';

const ROWS = [
  ['학습 상황', '2개', '전체'],
  ['페르소나 만들기', '생성권', '주 1회'],
  ['커스터마이징', '코인', '코인'],
];

// 12 요금제 팝업
export function Paywall({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { set } = useStore();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T style={{ fontFamily: F.logo, fontSize: 30 }}>Malo</T>
        <Tag label="PRO" tone="lime" />
      </View>
      <T s="h3" style={{ marginTop: 10 }}>모든 학습 상황을 열어 보세요</T>
      <View style={{ backgroundColor: C.bg, borderRadius: 16, padding: 14, marginTop: 14, gap: 10 }}>
        <Row a="" b="무료" c="PRO" head />
        {ROWS.map((r) => (
          <Row key={r[0]} a={r[0]} b={r[1]} c={r[2]} />
        ))}
      </View>
      <T s="small" style={{ marginTop: 10 }}>생성권·커스터마이징은 코인으로 사요. 코인은 장면을 끝내면 받아요.</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
        <T style={{ fontFamily: F.k, fontSize: 26 }}>월 6,900원</T>
        <T s="small" style={{ marginBottom: 5 }}>7일 무료 체험 후 결제</T>
      </View>
      <Btn label="7일 무료로 시작하기" icon="star" style={{ marginTop: 14 }} onPress={() => { set({ subscribed: true }); onClose(); }} />
      <Btn label="나중에 할게요" kind="ghost" small onPress={onClose} />
    </Sheet>
  );
}

function Row({ a, b, c, head }: { a: string; b: string; c: string; head?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <T style={{ flex: 1.6, fontFamily: F.m }}>{a}</T>
      <T style={{ flex: 1, textAlign: 'center', fontFamily: head ? F.m : F.b, color: head ? C.sub : C.ink }}>{b}</T>
      <T style={{ flex: 1, textAlign: 'center', fontFamily: F.b }}>{c}</T>
    </View>
  );
}
