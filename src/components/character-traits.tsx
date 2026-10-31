import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { api, CharacterCard } from '../lib/api';
import { CharId, IMG, PERSONAS, PersonaId, SERVER_CHAR, SERVER_PERSONA, charById } from '../lib/data';
import { profileCopy } from '../lib/learning-copy';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';
import { Btn, Sheet, T, Tag } from './ui';

// 캐릭터 카드 ⋯ → 자세한 특성. 프로필 API(/characters/{id}/personalities/{id}/profile)에서
// 꼭 필요한 것만: 나이·직업 / 취미 / 싫어하는 것 / 요즘 관심사 (항목당 최대 3개)
export function CharacterTraitsSheet({ char, persona, lang, onClose }: { char: CharId | null; persona: PersonaId; lang: string; onClose: () => void }) {
  const t = useT();
  const copy = profileCopy(lang);
  const [card, setCard] = useState<{ key: string; data?: CharacterCard; err?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = char ? `${char}:${persona}:${lang}:${attempt}` : '';
  useEffect(() => {
    if (!char) return;
    let alive = true;
    api.characterProfile(SERVER_CHAR[char], SERVER_PERSONA[persona], lang)
      .then((data) => alive && setCard({ key, data }))
      .catch(() => alive && setCard({ key, err: true }));
    return () => { alive = false; };
  }, [char, persona, lang, key]);
  const cur = card?.key === key ? card : null;
  const p = cur?.data?.profile;
  const ch = char ? charById(char) : null;
  const per = char ? PERSONAS[char].find((x) => x.id === persona) ?? PERSONAS[char][0] : null;
  const list = (a?: string[]) => (a ?? []).filter(Boolean).slice(0, 3).join(' · ');
  const rows: [string, string][] = p
    ? ([
        [`${copy.age} · ${copy.occupation}`, [p.age, p.occupation].filter(Boolean).join(' · ')],
        [copy.hobbies, list(p.hobbies)],
        [copy.dislikes, list(p.dislikes)],
        [copy.currentInterests, list(p.currentInterests)],
      ] as [string, string][]).filter(([, v]) => !!v)
    : [];
  return (
    <Sheet visible={!!char} onClose={onClose}>
      {char && ch && per ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 72, height: 84, borderRadius: 14, backgroundColor: '#F8F8F9', overflow: 'hidden' }}>
              <Image source={IMG.char[char]} style={{ width: 112, height: 216, marginLeft: -20, marginTop: 4 }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <T s="h2">{p?.name || t(ch.name)}</T>
                <T s="small">{t(ch.role)}</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Tag label={`${t('성격')} · ${cur?.data?.personalityName || t(per.name)}`} tone="lime" />
                <Tag label={t(per.level)} />
              </View>
            </View>
          </View>
          <T s="sub">{t(per.short)}</T>
          {cur?.err ? (
            <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
              <T s="body">{copy.error}</T>
              <Btn small kind="line" label={copy.retry} icon="rotate-cw" onPress={() => setAttempt((n) => n + 1)} />
            </View>
          ) : !p ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} accessibilityLiveRegion="polite">
              <ActivityIndicator color={C.ink} />
              <T s="sub">{copy.loading}</T>
            </View>
          ) : (
            <View style={{ backgroundColor: C.bg, borderRadius: 16, padding: 14, gap: 10 }}>
              {rows.map(([k, v]) => (
                <View key={k} style={{ gap: 2 }}>
                  <T s="small">{k}</T>
                  <T s="body" style={{ fontSize: 15, lineHeight: 22 }}>{v}</T>
                </View>
              ))}
            </View>
          )}
          <Btn label={t('닫기')} kind="line" onPress={onClose} />
        </View>
      ) : null}
    </Sheet>
  );
}
