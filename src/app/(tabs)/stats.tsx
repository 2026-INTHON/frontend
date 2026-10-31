import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, T } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { today, useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';

// 19 내 기록: 저장된 기록에서 계산해요 (홈·결과와 같은 숫자)
export default function Stats() {
  const st = useStore();
  const ins = useSafeAreaInsets();
  const t = useT();
  const scored = st.history.filter((h) => h.score != null);
  const avg = scored.length ? Math.round(scored.reduce((a, h) => a + (h.score ?? 0), 0) / scored.length) : null;
  // 최근 7일 (오늘이 맨 오른쪽)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = today(d);
    const rows = st.history.filter((h) => h.date === key && h.score != null);
    return { key, label: t('일|월|화|수|목|금|토').split('|')[d.getDay()], v: rows.length ? Math.round(rows.reduce((a, h) => a + (h.score ?? 0), 0) / rows.length) : null };
  });
  const recent = st.mistakes.slice(0, 3);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 8, padding: 24, gap: 14 }}>
      <T s="h1">{t('내 기록')}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [String(st.history.length), t('완료한 장면')],
          [t('{n}일', { n: st.streak }), t('연속 출석')],
          [avg == null ? '—' : String(avg), t('평균 점수')],
        ].map(([v, k]) => (
          <Card key={k} style={{ flex: 1, padding: 14 }}>
            <T style={{ fontFamily: F.k, fontSize: 24 }}>{v}</T>
            <T s="small">{k}</T>
          </Card>
        ))}
      </View>
      {st.history.length ? (
        <Card>
          <T s="h3">{t('최근 7일 점수')}</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 10, marginTop: 16 }}>
            {week.map((w, i) => (
              <View key={w.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <T s="small" style={{ color: C.ink }}>{w.v ?? ''}</T>
                <View style={{ width: '100%', height: w.v ? w.v * 1.2 : 4, borderRadius: 8, backgroundColor: w.v == null ? C.line : i === 6 ? C.lime : C.ink, borderWidth: i === 6 && w.v != null ? 1.5 : 0, borderColor: C.ink }} />
                <T s="small">{i === 6 ? t('오늘') : w.label}</T>
              </View>
            ))}
          </View>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <T s="h3">{t('첫 장면을 시작해 보세요')}</T>
          <Btn label={t('장면 시작하기')} small icon="play" onPress={() => router.push({ pathname: '/scene/[id]', params: { id: 'today' } })} />
        </Card>
      )}
      {recent.length ? (
        <Card style={{ gap: 12 }}>
          <T s="h3">{t('최근 말실수')}</T>
          {recent.map((m) => (
            <View key={m.id} style={{ gap: 2 }}>
              <T s="body" style={{ color: C.sub, textDecorationLine: 'line-through' }}>"{m.said}"</T>
              <T s="body">"{m.better}"</T>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}
