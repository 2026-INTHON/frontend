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

// 녹음 파일을 글자로 바꾸기. 지금은 데모 문장을 돌려주고, 나중에 gpt-transcribe API로 교체.
export async function transcribe(_uri: string | null, fallback: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1400));
  return fallback;
}
