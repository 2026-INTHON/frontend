import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, CharacterCard } from '../lib/api';
import { CharId, PersonaId, SERVER_CHAR, SERVER_PERSONA, charById } from '../lib/data';
import { C } from '../lib/theme';
import { Btn, T, Tag } from './ui';
import {useStore} from '../lib/store';
import {profileCopy} from '../lib/learning-copy';

// Non-modal disclosure, confined to the character artwork. No nested scene-start button.
export function CharacterProfileOverlay({ char, persona, open, onOpenChange }: { char: CharId; persona: PersonaId; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [card, setCard] = useState<CharacterCard | null>(null);
  const {lang}=useStore();
  const copy=profileCopy(lang);
  const [errorKey, setErrorKey] = useState<string|null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey=`${char}:${persona}:${lang}:${attempt}`;
  const error=errorKey===requestKey;
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api.characterProfile(SERVER_CHAR[char],SERVER_PERSONA[persona],lang).then(data => { if (alive){setCard(data);setErrorKey(null);} }).catch(() => { if (alive) setErrorKey(requestKey); });
    return () => { alive = false; };
  }, [open, char, persona, lang, attempt, requestKey]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onOpenChange]);
  const selected=card?.characterId===SERVER_CHAR[char]&&card.personalityId===SERVER_PERSONA[persona]&&card.language===lang?card:null;
  const profile = selected?.profile;
  const name = profile?.name ?? charById(char).name;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <View style={styles.panel}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }} accessibilityLabel={`${name} · ${copy.title}`}>
            <View style={{ gap: 8, paddingRight: 42, marginBottom: 8, flexDirection:'row',flexWrap:'wrap',alignItems:'center' }}>
              <T s="h2" style={{fontSize:20}}>{copy.title}</T>
              {selected ? <Tag label={selected.personalityName} tone="lime" /> : null}
            </View>
            {error ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 12 }}>
                <T s="body">{copy.error}</T>
                <Btn small kind="line" label={copy.retry} onPress={() => { setErrorKey(null); setCard(null); setAttempt(n => n + 1); }} />
              </View>
            ) : !profile ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 12 }}><ActivityIndicator color={C.ink} /><T s="sub">{copy.loading}</T></View>
            ) : (
              <>
                {(['name','occupation','age','hobbies','favoriteFoods','dislikes','currentInterests'] as const).map(key=><Detail key={key} label={copy[key]} text={Array.isArray(profile[key])?(profile[key] as string[]).join(' · '):profile[key] as string} />)}
              </>
            )}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button" accessibilityLabel={open ? copy.close : `${name} · ${copy.open}`}
        accessibilityState={{ expanded: open }}
        onPress={() => { setErrorKey(null); onOpenChange(!open); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [styles.toggle, { backgroundColor: open || hovered ? C.lime : C.white, borderColor: focused ? C.ink : 'transparent', opacity: pressed ? 0.75 : 1 }]}
      >
        <Feather name={open ? 'x' : 'rotate-cw'} size={21} color={C.ink} />
      </Pressable>
    </View>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  return <View style={{gap:10,flexDirection:'row',alignItems:'flex-start'}}><T s="small" style={{width:82,lineHeight:22}}>{label}</T><T s="body" style={{flex:1,fontSize:14,lineHeight:22}}>{text}</T></View>;
}
const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: C.profileSurface },
  toggle: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
