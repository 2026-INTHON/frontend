import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, ApiCharacter } from '../lib/api';
import { CharId, PersonaId, SERVER_CHAR, SERVER_PERSONA, charById } from '../lib/data';
import { C } from '../lib/theme';
import { Btn, T, Tag } from './ui';

// Non-modal disclosure, confined to the character artwork. No nested scene-start button.
export function CharacterProfileOverlay({ char, persona, open, onOpenChange }: { char: CharId; persona: PersonaId; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [catalog, setCatalog] = useState<ApiCharacter[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!open || catalog) return;
    let alive = true;
    api.characters().then(data => { if (alive) setCatalog(data); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [open, catalog, attempt]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onOpenChange]);
  const character = catalog?.find(c => c.id === SERVER_CHAR[char]);
  const selected = character?.personalities?.find(p => p.id === SERVER_PERSONA[persona]);
  const profile = selected?.profile;
  const name = character?.name ?? charById(char).name;
  const missing = !!catalog && !profile;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <View style={styles.panel}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 68, gap: 16 }} accessibilityLabel={`${name} 프로필`}>
            <View style={{ gap: 8 }}>
              <T s="h2">{name}의 프로필</T>
              {selected ? <Tag label={selected.name} tone="lime" /> : null}
            </View>
            {error || missing ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 12 }}>
                <T s="body">{missing ? '아직 등록된 프로필이 없어요.' : '프로필을 불러오지 못했어요.'}</T>
                <Btn small kind="line" label="다시 불러오기" onPress={() => { setError(false); setCatalog(null); setAttempt(n => n + 1); }} />
              </View>
            ) : !profile ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 12 }}><ActivityIndicator color={C.ink} /><T s="sub">프로필 불러오는 중…</T></View>
            ) : (
              <>
                <T s="body">{profile.introduction}</T>
                <Detail label="나이 · 직업" text={`${profile.age} · ${profile.occupation}`} />
                <Detail label="역할" text={profile.role} />
                <Detail label="우리의 관계" text={profile.relationship} />
                <Detail label="성격" text={profile.traits.join(' · ')} />
                <Detail label="좋아하는 것" text={profile.likes.join('\n')} />
                <Detail label="싫어하는 것" text={profile.dislikes.join('\n')} />
                <Detail label="취미" text={profile.hobbies.join('\n')} />
                <Detail label="소중하게 생각해요" text={profile.values.join(' · ')} />
                <Detail label="이렇게 말해요" text={profile.speakingStyle} />
                <View style={styles.quote}><T s="body">“{profile.sampleLines[0]}”</T></View>
              </>
            )}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button" accessibilityLabel={open ? '프로필 닫기' : `${name} 프로필 보기`}
        accessibilityState={{ expanded: open }}
        onPress={() => { setError(false); onOpenChange(!open); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [styles.toggle, { backgroundColor: open || hovered ? C.lime : C.white, borderColor: focused ? C.ink : 'transparent', opacity: pressed ? 0.75 : 1 }]}
      >
        <Feather name={open ? 'x' : 'rotate-cw'} size={21} color={C.ink} />
      </Pressable>
    </View>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  return <View style={{ gap: 5 }}><T s="label">{label}</T><T s="body">{text}</T></View>;
}
const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: C.profileSurface },
  toggle: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  quote: { backgroundColor: C.white, borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: C.lime },
});
