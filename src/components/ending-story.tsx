import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { api, absUrl } from '../lib/api';
import { CHARACTERS, CharId, IMG } from '../lib/data';
import type { Ending } from '../lib/engine';
import { speak, stopSpeak } from '../lib/voice';
import { C, F } from '../lib/theme';
import { Card, T, Tag } from './ui';

// 엔딩 (FE_MIGRATION_V2): 마지막 반응 대사(표정·자막·음성) → 정리 카드
// 학습 판정(O·△·X·?)·점수와는 따로 보여 줘요. 결말 종류로 점수를 다시 계산하지 않아요.

export function EndingDialogue({ ending, char, sessionId, pack }: { ending: Ending; char: CharId; sessionId?: string | null; pack: 'ko' | 'en' }) {
  const ch = CHARACTERS.find((c) => c.id === char) ?? CHARACTERS[0];
  const d = ending.dialogue;
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const player = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const audio = useRef<string | null>(d?.audio ?? null);

  useEffect(
    () => () => {
      stopSpeak();
      player.current?.remove();
    },
    [],
  );

  async function play() {
    if (!d) return;
    if (state === 'playing') {
      player.current?.pause();
      stopSpeak();
      setState('idle');
      return;
    }
    player.current?.remove();
    player.current = null;
    // 서버 세션: 이미 받은 마지막 음성 → 없거나 만료되면 그 턴(turnId)으로 다시 발급
    if (sessionId) {
      let url = audio.current;
      if (!url && d.turnId) {
        setState('loading');
        try {
          url = absUrl((await api.speech(sessionId, d.turnId)).audioUrl);
          audio.current = url;
        } catch {
          url = null;
        }
      }
      if (!url) return setState('error'); // 대사·자막은 그대로, 다시 듣기만 제공
      try {
        const pl = createAudioPlayer({ uri: url });
        player.current = pl;
        pl.addListener('playbackStatusUpdate', (s: any) => s.didJustFinish && setState('idle'));
        pl.play();
        setState('playing');
        audio.current = null; // 다음엔 새로 발급 (10분 만료 대비)
      } catch {
        setState('error');
      }
      return;
    }
    // 데모: 기기 음성
    setState('playing');
    speak(d.text, { lang: pack === 'ko' ? 'ko-KR' : 'en-US', onDone: () => setState('idle') });
  }

  // 표정: 서버가 고른 이미지(배경 있음)는 둥근 카드 안에, 없으면 앱 캐릭터
  const src = ending.image ? { uri: ending.image } : IMG.char[char];
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ backgroundColor: ending.image ? C.bg : '#EFEDE7', height: 300, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode={ending.image ? 'cover' : 'contain'} accessibilityLabel={`${ch.name}의 마지막 표정`} />
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <Tag label={ending.kind === 'happy' ? '해피 엔딩' : '아쉬운 엔딩'} tone={ending.kind === 'happy' ? 'lime' : 'white'} />
        </View>
      </View>
      {d ? (
        <View style={{ padding: 16, gap: 6 }}>
          <T s="label">{ch.name}</T>
          <T style={{ fontFamily: F.b, fontSize: 20, lineHeight: 28, color: C.ink }}>{d.text}</T>
          {d.sub ? <T s="sub">{d.sub}</T> : null}
          <Pressable onPress={play} accessibilityRole="button" accessibilityLabel={state === 'playing' ? '멈추기' : '마지막 대사 듣기'} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: C.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginTop: 4 }}>
            {state === 'loading' ? <ActivityIndicator size="small" color={C.ink} /> : <Feather name={state === 'playing' ? 'pause' : state === 'error' ? 'rotate-cw' : 'volume-2'} size={16} color={C.ink} />}
            <T s="label">{state === 'playing' ? '멈추기' : state === 'error' ? '음성을 못 불러왔어요 · 다시 듣기' : '다시 듣기'}</T>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

export function RecapCard({ ending }: { ending: Ending }) {
  const r = ending.recap;
  // 정리 카드가 없는 예전 기록: 결말 제목·문장만
  if (!r) {
    return (
      <Card style={{ gap: 4 }}>
        <T s="small">이야기의 결말</T>
        <T s="h3">{ending.title}</T>
        <T s="sub">{ending.text}</T>
      </Card>
    );
  }
  const tr = r.tr; // 선택 언어가 있으면 먼저, 한국어 원문은 아래에
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <T s="small">정리 카드</T>
        <T s="h3">{tr?.title ?? r.title}</T>
        {tr && tr.title !== r.title ? <T s="small">{r.title}</T> : null}
      </View>
      <Row k="이야기" a={tr?.story ?? r.story} b={tr ? r.story : undefined} />
      <Row k="코멘트" a={tr?.comment ?? r.comment} b={tr ? r.comment : undefined} />
      <View style={{ backgroundColor: C.lime, borderRadius: 14, padding: 12, gap: 2 }}>
        <T s="label">{tr?.prompt ?? r.prompt}</T>
        {tr && tr.prompt !== r.prompt ? <T s="small" style={{ color: C.ink }}>{r.prompt}</T> : null}
      </View>
    </Card>
  );
}

function Row({ k, a, b }: { k: string; a: string; b?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T s="small">{k}</T>
      <T s="body">{a}</T>
      {b && b !== a ? <T s="small">{b}</T> : null}
    </View>
  );
}
