import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Chip, Screen, T, Tag, TopBar } from '../components/ui';
import { Paywall } from '../components/paywall';
import { C } from '../lib/theme';
import { CHAPTERS, CHARACTERS, CharId, IMG, PERSONAS, SERVER_CHAR, charById } from '../lib/data';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useGenerationJobs } from '../lib/generations';

// 화면에 그릴 챕터 모양 (서버 /chapters 또는 데모 대본)
type Sub = { id: string; title: string; sceneId: string | null; state: 'done' | 'now' | 'open' | 'locked'; grade?: string | null; ready: boolean };
type Chapter = { id: string; no: number; title: string; desc: string; locked: boolean; generating: boolean; failed: boolean; personal: boolean; subs: Sub[] };

function fromDemo(): Chapter[] {
  return CHAPTERS.map((c) => ({
    id: `demo-${c.no}`,
    no: c.no,
    title: c.title,
    desc: c.desc,
    locked: c.locked,
    generating: false,
    failed: false,
    personal: false,
    subs: c.subs.map((s) => ({ id: s.id, title: s.title, sceneId: s.scene ?? null, state: s.state, grade: s.grade, ready: !!s.scene })),
  }));
}

// 11 에피소드: 캐릭터별 챕터 → 서브 챕터. 서버 챕터를 그대로 보여 줘요.
export default function Episodes() {
  const st = useStore();
  const [char, setChar] = useState<CharId>(st.char);
  const [pw, setPw] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const persona = PERSONAS[char].find((p) => p.id === st.persona) ?? PERSONAS[char][2];

  const [tick, setTick] = useState(0); // 다시 시도
  // 생성 작업: ready 가 되면 챕터 목록을 다시 불러와요
  const gen = useGenerationJobs(!st.demo, () => setTick((t) => t + 1));
  const myJobs = gen.jobs.filter((j) => j.characterId === SERVER_CHAR[char] && j.status !== 'ready');
  const key = `${char}-${st.pack}-${tick}`;
  const [res, setRes] = useState<{ key: string; list?: Chapter[]; err?: string } | null>(null);
  useEffect(() => {
    if (st.demo) return;
    let alive = true;
    api
      .chapters({ pack: st.pack, characterId: SERVER_CHAR[char] })
      .then((rows) => {
        const l: Chapter[] = rows.map((c, i) => ({
          id: c.id,
          no: c.no ?? i + 1,
          title: c.title,
          desc: c.description ?? c.desc ?? '',
          locked: !!c.locked,
          generating: c.generationStatus === 'generating',
          failed: c.generationStatus === 'failed',
          personal: c.source === 'personal',
          subs: (c.subs ?? []).map((s) => ({ id: s.id, title: s.title, sceneId: s.sceneId ?? null, state: s.state ?? 'open', grade: s.grade ?? (s.score != null ? String(s.score) : null), ready: !!s.sceneId && (s.availability ?? 'ready') === 'ready' })),
        }));
        if (alive) setRes({ key, list: l });
      })
      .catch(() => alive && setRes({ key, err: '챕터를 불러오지 못했어요.' }));
    return () => {
      alive = false;
    };
  }, [char, st.demo, st.pack, key]);
  // 데모 대본은 서윤 챕터만 있어요
  const cur = res?.key === key ? res : null;
  const list: Chapter[] | null = st.demo ? (char === 'seoyun' ? fromDemo() : []) : (cur?.list ?? null);
  const err = st.demo ? null : (cur?.err ?? null);
  const load = () => setTick((t) => t + 1);
  // 펼친 챕터: 직접 고르기 전엔 진행 중인 챕터
  const shown = open ?? list?.find((c) => c.subs.some((s) => s.state === 'now'))?.id ?? list?.[0]?.id ?? null;

  const c = charById(char);
  return (
    <Screen>
      <TopBar title={`${c.name} · 챕터`} />
      {/* 캐릭터 바꿔 보기 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingVertical: 8 }}>
        {CHARACTERS.map((x) => (
          <Chip key={x.id} label={`${x.name}${x.free || st.subscribed ? '' : ' 🔒'}`} on={x.id === char} onPress={() => { setChar(x.id); setOpen(null); }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
        <Tag label={c.role} tone="white" />
        <Tag label={`성격 · ${persona.name}`} tone="white" />
        {st.demo ? <Tag label="예시 대화" tone="grey" /> : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {/* 생성 중·실패한 나만의 챕터 (퍼센트 게이지 없이 단계만) */}
        {myJobs.map((j) => (
          <View key={j.id} style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink }}>
            <T s="small">나만의 챕터</T>
            <T s="h3">{j.label || '새 챕터'}</T>
            {j.status === 'failed' ? (
              <>
                <T s="small">{j.error?.message ?? '만들지 못했어요.'}</T>
                {j.error?.retryable !== false ? <Btn label="이어서 다시 만들기" small kind="line" icon="rotate-cw" onPress={() => api.retryGeneration(j.id).then(() => gen.refresh()).catch(() => null)} /> : null}
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={C.ink} size="small" />
                <T s="small">장면 만드는 중…</T>
              </View>
            )}
          </View>
        ))}
        {err ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 10 }}>
            <T s="label">{err}</T>
            <Btn label="다시 시도" small icon="rotate-cw" onPress={load} />
          </View>
        ) : !list ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={C.ink} />
            <T s="small">챕터 불러오는 중…</T>
          </View>
        ) : !list.length ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 6 }}>
            <T s="label">아직 열린 챕터가 없어요</T>
            <T s="sub">{st.demo ? '예시 대화는 서윤 챕터만 있어요.' : '다른 캐릭터를 골라 보세요.'}</T>
          </View>
        ) : null}
        {list?.map((ch) => {
          const locked = ch.locked && !st.subscribed;
          const isOpen = shown === ch.id && !locked && !ch.generating;
          const done = ch.subs.filter((s) => s.state === 'done').length;
          const now = ch.subs.some((s) => s.state === 'now');
          return (
            <View key={ch.id} style={{ backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', borderWidth: now ? 2 : 0, borderColor: C.ink }}>
              <Pressable
                disabled={ch.generating}
                onPress={() => (locked ? setPw(true) : setOpen(isOpen ? '' : ch.id))}
                accessibilityRole="button"
                accessibilityLabel={`챕터 ${ch.no} ${ch.title}${locked ? ', 구독하면 열려요' : ch.generating ? ', 생성 중' : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.bg, overflow: 'hidden' }}>
                  <Image source={IMG.char[char]} style={{ width: 64, height: 200, marginTop: 2, opacity: locked || ch.generating ? 0.35 : 1 }} resizeMode="contain" />
                  {locked ? <Feather name="lock" size={18} color={C.ink} style={{ position: 'absolute', top: 22, alignSelf: 'center' }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T s="small">{ch.personal ? '나만의 챕터' : `CHAPTER ${ch.no}`}</T>
                  <T s="h3">{ch.title}</T>
                  <T s="small">{ch.generating ? '장면 만드는 중…' : ch.failed ? '생성하지 못했어요' : locked ? '구독하면 열려요' : `${ch.desc ? `${ch.desc} · ` : ''}${done}/${ch.subs.length}`}</T>
                </View>
                {now ? <Tag label="진행 중" tone="lime" /> : ch.subs.length && done === ch.subs.length ? <Tag label="완료" tone="dark" /> : null}
                <Feather name={locked ? 'lock' : ch.generating ? 'loader' : isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.ink} />
              </Pressable>
              {isOpen ? (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                  {ch.subs.map((s) => {
                    const can = s.ready && s.state !== 'locked';
                    return (
                      <Pressable
                        key={s.id}
                        disabled={!can}
                        onPress={() => s.sceneId && router.push({ pathname: '/scene/[id]', params: { id: s.sceneId } })}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !can }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: s.state === 'now' && can ? C.lime : C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, opacity: can ? 1 : 0.5 }}
                      >
                        <T s="label" style={{ flex: 1 }}>{s.title}</T>
                        {!can ? <T s="small">준비 중</T> : s.state === 'done' && s.grade ? <T s="label">{s.grade}</T> : null}
                        <Feather name={!can ? 'lock' : s.state === 'done' ? 'check' : s.state === 'now' ? 'play' : 'chevron-right'} size={16} color={C.ink} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
        {!st.demo ? (
          <Pressable onPress={() => router.push('/chapter-create')} accessibilityRole="button" style={{ height: 56, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Feather name="plus" size={18} color={C.ink} />
            <T s="label">나만의 챕터 만들기</T>
          </Pressable>
        ) : null}
      </ScrollView>
      <Paywall visible={pw} onClose={() => setPw(false)} />
    </Screen>
  );
}
