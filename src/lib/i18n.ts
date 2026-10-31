import { useCallback } from 'react';
import { DICT } from './i18n-dict';
import { useStore } from './store';

// 앱 표시 언어. 화면 문구는 한국어 원문을 키로 쓰고, 선택한 언어 번역을 보여 줘요.
// 캐릭터 대사·내 답변·한국어 예시 답변은 번역하지 않아요 (t()로 감싸지 않아요).
// 번역이 없는 문구(서버가 준 한국어 설명 등)는 원문 그대로 보여 줘요.
export type UiLang = 'en' | 'ja' | 'zh' | 'ko';
export const UI_LANGS: { id: UiLang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
  { id: 'zh', name: '简体中文' },
  { id: 'ko', name: '한국어' },
];
const COL: Record<Exclude<UiLang, 'ko'>, 0 | 1 | 2> = { en: 0, ja: 1, zh: 2 };

// 저장된 값 정리: 지원하지 않는 언어는 English. 한국어를 고르면 화면도 한국어 원문 그대로예요.
export function normLang(l: string | undefined): UiLang {
  return l === 'en' || l === 'ja' || l === 'zh' || l === 'ko' ? l : 'en';
}

export type Vars = Record<string, string | number | null | undefined>;
export function tr(lang: string, ko: string, vars?: Vars): string {
  const L = normLang(lang);
  const row = L === 'ko' ? undefined : DICT[ko];
  let s = row ? row[COL[L as Exclude<UiLang, 'ko'>]] : ko;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k] ?? ''));
  return s;
}
export const hasTr = (ko: string) => !!DICT[ko];

export function useT() {
  const { lang } = useStore();
  return useCallback((ko: string, vars?: Vars) => tr(lang, ko, vars), [lang]);
}
export function useLang(): UiLang {
  const { lang } = useStore();
  return normLang(lang);
}
