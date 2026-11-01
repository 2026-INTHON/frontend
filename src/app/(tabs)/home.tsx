import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, CoinPill, IconBtn, T, Tag } from '../../components/ui';
import { C, F } from '../../lib/theme';
import { CharId, IMG, PERSONAS, PLACE_OF, PersonaId, charById, sceneById, sceneForChar } from '../../lib/data';
import { LastPlayed, useStore } from '../../lib/store';
import { useAccount } from '../../lib/useAccount';
import { localizedSceneTitle, resolveTodayScene } from '../../lib/engine';
import { CharacterTraitsSheet } from '../../components/character-traits';
import { tr, useT } from '../../lib/i18n';
import { demoBrief } from '../../lib/demo-briefings';

// 09 홈: 방금 한 대화를 그대로 이어서 보여 줘요 (고정 문구·가짜 보상 없음)
export default function Home() {
  const st = useStore();
  const acc = useAccount();
  const [info, setInfo] = useState(false); // ⋯ 자세한 특성
  const ins = useSafeAreaInsets();
  const t = useT();
  // 캐릭터를 바꿨으면 그 캐릭터 기준으로 (이전 캐릭터의 이어하기는 숨겨요)
  const lp = st.lastPlayed && st.lastPlayed.char === st.char && st.lastPlayed.persona === st.persona ? st.lastPlayed : null;
  const charId = st.char;
  const personaId = lp?.persona ?? st.persona;
  const c = charById(charId);
  const p = PERSONAS[charId].find((x) => x.id === personaId) ?? PERSONAS[charId][2];
  const today = useToday(st.demo, charId, personaId, st.pack, st.lang, !lp);
  const lpTitle = useLastTitle(st.demo, lp, st.pack, st.lang);

  // 이어갈 장면과 버튼 이름을 실제 상태에 맞춰요
  const next =
    lp?.status === 'done'
      ? lp.nextSceneId
        ? { id: lp.nextSceneId, tag: t('다음 장면'), title: t('다음 장면'), sub: t('지난번: {title} 완료', { title: lpTitle || t('장면') }), btn: t('다음 장면 시작') }
        : { id: lp.sceneId, tag: t('다시 하기'), title: lpTitle || t('방금 한 장면'), sub: t('완료했어요 · 한 번 더 연습해 볼까요?'), btn: t('다시 하기') }
      : lp
        ? { id: lp.sceneId, tag: t('이어하기'), title: lpTitle || t('하던 장면'), sub: lp.progress ? '' : t('하던 장면이 있어요'), btn: t('이어하기') }
        : { id: today.sceneId ?? 'today', tag: t('오늘의 장면'), title: today.title ?? (today.loading ? t('장면 불러오는 중…') : t('오늘의 장면')), sub: today.err ? t(today.err) : t('첫 장면을 시작해 볼까요?'), btn: t('시작하기') };
  const name = acc.user && !acc.user.isGuest && acc.user.displayName && acc.user.displayName !== '게스트' && acc.user.displayName !== 'Guest' ? acc.user.displayName : null;
  // 진행률: "2/5 대사" → 0.4 (끝낸 장면은 꽉 채움)
  const go = () => router.push({ pathname: '/scene/[id]', params: { id: next.id } });
  const position = lp?.progress?.match(/^(\d+)\/(\d+)/);
  const progress = lp?.status === 'done'
    ? (lp.nextSceneId ? 0 : 1)
    : position && Number(position[2]) > 0
      ? Math.max(0, Math.min(1, (Number(position[1]) - 1) / Number(position[2])))
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    {/* 작은 화면: 본문만 스크롤, 시작 버튼은 아래에 따로 고정 (본문을 덮지 않게) */}
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(ins.top, 12) + 12, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
        <T s="h2" style={{ flex: 1 }}>{name ? t('{name}님, 오늘도 한 장면만', { name }) : t('오늘도 한 장면만 해 볼까요?')}</T>
        <IconBtn name="settings" size={36} onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 24, marginTop: 8, gap: 8 }}>
        {st.streak > 0 ? <Tag label={`🔥 ${t('연속 {n}일', { n: st.streak })}`} tone="white" /> : <Tag label={t('오늘 첫 장면을 끝내면 연속 1일')} tone="white" />}
        {st.demo ? <Tag label={t('체험 중')} tone="grey" /> : null}
        <View style={{ flex: 1 }} />
        <CoinPill />
      </View>

      {/* 오늘의 장면 / 이어하기 */}
      <View style={{ flex: 1, minHeight: 300, marginHorizontal: 24, marginTop: 14, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEE6DB' }}>
        <Image source={IMG.bg[PLACE_OF[charId]]} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
        {/* 사진 위에 정보 카드가 겹치는 홈 구성. 오른쪽 위 ⋯ 는 캐릭터 자세한 특성(바텀시트) */}
        <Image source={IMG.char[charId]} style={{ position: 'absolute', top: 18, left: '31%', width: '62%', height: '96%' }} resizeMode="contain" />
        <View style={{ flex: 1, minHeight: 190 }}>
          <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`${next.tag}: ${next.title}`} style={{ flex: 1 }} />
          <View style={{ position: 'absolute', top: 14, right: 14 }}>
            <IconBtn name="more-horizontal" size={44} label={t('{name} 자세한 특성', { name: t(c.name) })} onPress={() => setInfo(true)} />
          </View>
        </View>
        <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={t('{title} 시작', { title: next.title })} style={{ backgroundColor: C.white, padding: 24, gap: 6 }}>
          <Tag label={next.tag} tone="dark" />
          <T s="h2">{next.title}</T>
          <T s="sub" numberOfLines={1}>{t(c.name)} · {t(p.name)}{next.sub ? ` · ${next.sub}` : ''}</T>
          <View accessibilityRole="progressbar" accessibilityLabel={t('장면 진행률')} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 6 }}>
            <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: C.ink }} />
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 12 }}>
        <Tile icon="grid" t={t('다른 장면')} s={t('챕터 목록')} onPress={() => router.push('/episodes')} />
        <Tile icon="user" t={t('대화 상대')} s={t('캐릭터 목록')} onPress={() => router.push('/characters')} />
      </View>
    </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.bg }}>
        <Btn label={next.btn} icon="play" onPress={go} />
      </View>
      <CharacterTraitsSheet char={info ? charId : null} persona={personaId} lang={st.lang} onClose={() => setInfo(false)} />
    </View>
  );
}

// 처음 시작하는 사람의 '오늘의 장면': 서버 챕터에서 내 캐릭터의 열린 장면 (데모 모드는 앱 안 대본)
function useToday(demo: boolean, char: CharId, persona: PersonaId, pack: 'ko' | 'en', language: string, need: boolean): { sceneId?: string; title?: string; loading: boolean; err?: string } {
  const key = `${char}-${persona}-${pack}-${language}`;
  const [s, setS] = useState<{ key: string; sceneId?: string; title?: string; err?: string } | null>(null);
  useEffect(() => {
    if (!need || demo) return;
    let alive = true;
    resolveTodayScene(char, persona, pack, language)
      .then((r) => alive && setS(r ? { key, ...r } : { key, err: '지금 열린 장면이 없어요.' }))
      .catch(() => alive && setS({ key, err: '장면 목록을 불러오지 못했어요. 눌러서 바로 시작할 수 있어요.' }));
    return () => {
      alive = false;
    };
  }, [demo, char, persona, pack, language, need, key]);
  if (demo) {
    const sc = sceneForChar(char);
    return { sceneId: sc.id, title: demoBrief(sc.id, language)?.title ?? tr(language, sc.title), loading: false };
  }
  const cur = s?.key === key ? s : null;
  return { sceneId: cur?.sceneId, title: cur?.title, err: cur?.err, loading: need && !cur };
}

// 이어하기 제목: 저장할 때 언어와 지금 언어가 다르면(언어를 바꿨으면) 지금 언어 제목을 다시 찾아요.
// 찾는 동안은 '' (화면은 '하던 장면' 같은 기본 문구), 못 찾으면 저장된 제목 그대로.
function useLastTitle(demo: boolean, lp: LastPlayed | null, pack: 'ko' | 'en', language: string): string {
  const char = lp?.char;
  const sceneId = lp?.sceneId;
  const stale = !!lp && lp.lang !== language;
  const key = `${char}-${sceneId}-${pack}-${language}`;
  const [s, setS] = useState<{ key: string; title: string | null } | null>(null);
  useEffect(() => {
    if (!char || !sceneId || !stale || demo) return;
    let alive = true;
    localizedSceneTitle(char, sceneId, pack, language)
      .then((title) => alive && setS({ key, title }))
      .catch(() => alive && setS({ key, title: null }));
    return () => {
      alive = false;
    };
  }, [demo, char, sceneId, stale, pack, language, key]);
  if (!lp) return '';
  if (!stale) return lp.title;
  if (demo) {
    const sc = sceneById(lp.sceneId);
    return sc ? demoBrief(sc.id, language)?.title ?? tr(language, sc.title) : lp.title;
  }
  const cur = s?.key === key ? s : null;
  return cur ? cur.title ?? lp.title : '';
}

function Tile({ icon, t, s, onPress }: { icon: keyof typeof Feather.glyphMap; t: string; s: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <T s="label">{t}</T>
        <T s="small">{s}</T>
      </View>
    </Card>
  );
}
