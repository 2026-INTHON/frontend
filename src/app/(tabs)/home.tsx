import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, CoinPill, IconBtn, T, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { CharId, IMG, PERSONAS, PLACE_OF, PersonaId, charById, sceneForChar } from '../../lib/data';
import { useStore } from '../../lib/store';
import { useAccount } from '../../lib/useAccount';
import { resolveTodayScene } from '../../lib/engine';
import { CharacterProfileOverlay } from '../../components/character-profile';

// 09 홈: 방금 한 대화를 그대로 이어서 보여 줘요 (고정 문구·가짜 보상 없음)
export default function Home() {
  const st = useStore();
  const acc = useAccount();
  const [profile, setProfile] = useState({ key: '', open: false });
  const ins = useSafeAreaInsets();
  // 캐릭터를 바꿨으면 그 캐릭터 기준으로 (이전 캐릭터의 이어하기는 숨겨요)
  const lp = st.lastPlayed && st.lastPlayed.char === st.char && st.lastPlayed.persona === st.persona ? st.lastPlayed : null;
  const charId = st.char;
  const personaId = lp?.persona ?? st.persona;
  const profileKey = `${charId}-${personaId}`;
  if (profile.key !== profileKey) setProfile({ key: profileKey, open: false });
  const profileOpen = profile.key === profileKey && profile.open;
  const setProfileOpen = useCallback((open: boolean) => setProfile({ key: profileKey, open }), [profileKey]);
  const c = charById(charId);
  const p = PERSONAS[charId].find((x) => x.id === personaId) ?? PERSONAS[charId][2];
  const today = useToday(st.demo, charId, personaId, st.pack, st.lang, !lp);

  // 이어갈 장면과 버튼 이름을 실제 상태에 맞춰요
  const next =
    lp?.status === 'done'
      ? lp.nextSceneId
        ? { id: lp.nextSceneId, tag: '다음 장면', title: '다음 장면', sub: `지난번: ${lp.title || '장면'} 완료`, btn: '다음 장면 시작' }
        : { id: lp.sceneId, tag: '다시 하기', title: lp.title || '방금 한 장면', sub: '완료했어요 · 한 번 더 연습해 볼까요?', btn: '다시 하기' }
      : lp
        ? { id: lp.sceneId, tag: '이어하기', title: lp.title || '하던 장면', sub: lp.progress ? `${lp.progress}까지 했어요` : '하던 장면이 있어요', btn: '이어하기' }
        : { id: today.sceneId ?? 'today', tag: '오늘의 장면', title: today.title ?? (today.loading ? '장면 불러오는 중…' : '오늘의 장면'), sub: today.err ?? '첫 장면을 시작해 볼까요?', btn: '시작하기' };
  const name = acc.user && !acc.user.isGuest && acc.user.displayName && acc.user.displayName !== '게스트' ? acc.user.displayName : null;
  const go = () => router.push({ pathname: '/scene/[id]', params: { id: next.id } });
  const position = lp?.progress?.match(/^(\d+)\/(\d+)/);
  const progress = lp?.status === 'done'
    ? (lp.nextSceneId ? 0 : 1)
    : position && Number(position[2]) > 0
      ? Math.max(0, Math.min(1, (Number(position[1]) - 1) / Number(position[2])))
      : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(ins.top, 12) + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
        <T s="h2" style={{ flex: 1 }}>{name ? `${name}님, 오늘도 한 장면만` : '오늘도 한 장면만 해 볼까요?'}</T>
        <IconBtn name="settings" size={36} onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 8, gap: 8 }}>
        {st.streak > 0 ? <Tag label={`🔥 연속 ${st.streak}일`} tone="white" /> : <Tag label="오늘 첫 장면을 끝내면 연속 1일" tone="white" />}
        {st.demo ? <Tag label="체험 중" tone="grey" /> : null}
        <View style={{ flex: 1 }} />
        <CoinPill />
      </View>

      {/* 오늘의 장면 / 이어하기 */}
      <View style={{ flex: 1, minHeight: 340, marginHorizontal: 24, marginTop: 14, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEE6DB' }}>
        <Image source={IMG.bg[PLACE_OF[charId]]} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
        {/* 사진 위에 정보 카드가 겹치는 홈 구성. 프로필은 위쪽 사진 영역에서만 펼쳐져요. */}
        <Image source={IMG.char[charId]} style={{ position: 'absolute', top: 18, left: '31%', width: '62%', height: '96%' }} resizeMode="contain" />
        <View style={{ flex: 1, minHeight: 190 }}>
          <Pressable onPress={go} disabled={profileOpen} accessible={!profileOpen} aria-hidden={profileOpen} accessibilityElementsHidden={profileOpen} importantForAccessibility={profileOpen ? 'no-hide-descendants' : 'auto'} accessibilityRole="button" accessibilityLabel={`${next.tag}: ${next.title}`} style={{ flex: 1 }} />
          <CharacterProfileOverlay key={`${charId}-${personaId}`} char={charId} persona={personaId} open={profileOpen} onOpenChange={setProfileOpen} />
        </View>
        <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`${next.title} 시작`} style={{ marginHorizontal: 12, marginBottom: 12, backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 6 }}>
          <Tag label={next.tag} tone="dark" />
          <T s="h2">{next.title}</T>
          <T s="sub">{c.name} · {p.name} · {next.sub}</T>
          <View accessibilityRole="progressbar" accessibilityLabel="장면 진행률" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 6 }}>
            <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: C.ink }} />
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 12 }}>
        <Tile icon="grid" t="다른 장면" s="챕터 목록" onPress={() => router.push('/episodes')} />
        <Tile icon="user" t="대화 상대" s="캐릭터 목록" onPress={() => router.push('/characters')} />
      </View>
      <View style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
        <Btn label={next.btn} icon="play" onPress={go} />
      </View>
    </ScrollView>
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
    return { sceneId: sc.id, title: sc.title, loading: false };
  }
  const cur = s?.key === key ? s : null;
  return { sceneId: cur?.sceneId, title: cur?.title, err: cur?.err, loading: need && !cur };
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
