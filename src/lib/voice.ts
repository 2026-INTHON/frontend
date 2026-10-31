import * as Speech from 'expo-speech';

// 캐릭터 대사 읽기. 지금은 기기 TTS(expo-speech), 나중에 Azure Speech로 교체.
export function speak(text: string, opts: { lang?: string; onDone?: () => void } = {}) {
  try {
    Speech.stop();
    Speech.speak(text, { language: opts.lang ?? 'ko-KR', rate: 1.0, onDone: opts.onDone, onStopped: opts.onDone, onError: opts.onDone });
  } catch {
    opts.onDone?.();
  }
}
export function stopSpeak() {
  try {
    Speech.stop();
  } catch {}
}
