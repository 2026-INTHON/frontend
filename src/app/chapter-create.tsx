import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Btn, Chip, Screen, T, TopBar } from '../components/ui';
import { C, F } from '../lib/theme';
import { CHARACTERS, CharId, PERSONAS, PersonaId, SERVER_CHAR, SERVER_PERSONA } from '../lib/data';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { PushRow } from '../components/push-row';

// 나만의 챕터 만들기: 상황을 적으면 서버가 2~4개 서브 챕터를 만들어요 (만드는 동안 다른 학습 가능)
export default function ChapterCreate() {
  const st = useStore();
  const [char, setChar] = useState<CharId>(st.char);
  const [persona, setPersona] = useState<PersonaId>(st.persona);
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 네트워크 실패 후 다시 보낼 땐 같은 요청 ID (중복 생성 방지). 내용을 바꾸면 새 ID.
  const [req, setReq] = useState<{ id: string; key: string } | null>(null);
  const free = (id: CharId) => st.subscribed || !!CHARACTERS.find((c) => c.id === id)?.free;

  async function submit() {
    const text = prompt.trim();
    if (text.length < 10 || busy) return;
    const key = `${char}|${persona}|${count}|${text}`;
    const id = req && req.key === key ? req.id : Crypto.randomUUID();
    setReq({ id, key });
    setBusy(true);
    setErr(null);
    try {
      await api.generate({ clientRequestId: id, prompt: text, characterId: SERVER_CHAR[char], personalityId: SERVER_PERSONA[persona], pack: st.pack, lessonCount: count });
      st.set({ char });
      router.replace('/episodes');
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) {
        setErr(e.message || '만들 수 없는 내용이에요. 고쳐서 다시 시도해 주세요.');
        setReq(null); // 내용을 고치면 새 요청
      } else setErr('보내지 못했어요. 다시 누르면 같은 요청으로 다시 보내요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar title="나만의 챕터 만들기" />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <T s="label">누구와의 상황이에요?</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CHARACTERS.map((c) => (
            <Chip key={c.id} label={`${c.name}${free(c.id) ? '' : ' 🔒'}`} on={char === c.id} onPress={() => free(c.id) && setChar(c.id)} />
          ))}
        </View>
        <T s="label">성격</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERSONAS[char].map((p) => (
            <Chip key={p.id} label={p.name} on={persona === p.id} onPress={() => setPersona(p.id)} />
          ))}
        </View>
        <T s="label">어떤 상황을 연습할까요?</T>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholder="예) 과제 제출을 깜빡했어요. 교수님은 실망한 상태예요. 사과하고 내일 저녁까지 낼 기회를 정중히 부탁하고 싶어요."
          placeholderTextColor={C.sub}
          accessibilityLabel="연습할 상황"
          style={{ minHeight: 140, backgroundColor: C.white, borderRadius: 16, padding: 14, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: 'top' }}
        />
        <T s="small">감정·배경·바라는 결말을 자세히 쓸수록 좋아요. 서브 챕터 하나에 약 5분이에요.</T>
        <T s="label">서브 챕터 수</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[2, 3, 4].map((n) => (
            <Chip key={n} label={`${n}개`} on={count === n} onPress={() => setCount(n)} />
          ))}
        </View>
        {err ? <T s="label">{err}</T> : null}
        <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 14 }}>
          <PushRow />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 6 }}>
        <Btn label={busy ? '보내는 중…' : '만들기 시작'} icon="star" disabled={busy || prompt.trim().length < 10} onPress={submit} />
        <T s="small" style={{ textAlign: 'center' }}>만드는 동안 다른 장면을 해도 돼요</T>
      </View>
    </Screen>
  );
}
