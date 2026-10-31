import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { api, absUrl, type Emotion } from './api';
import { SERVER_CHAR, SERVER_PERSONA, type CharId, type PersonaId } from './data';

let generation = 0;
let player: ReturnType<typeof createAudioPlayer> | null = null;

// 데모 엔딩·표현 연습도 같은 캐릭터 서버 음성. 기기 TTS로 대체하지 않는다.
export async function speak(text: string, opts: { lang?: string; char?: CharId; persona?: PersonaId; emotion?: Emotion; onDone?: () => void; onError?: () => void } = {}) {
  stopSpeak();
  const current = generation;
  try {
    const audio = await api.previewSpeech({text,pack:opts.lang==='en-US'?'en':'ko',characterId:SERVER_CHAR[opts.char??'seoyun'],personalityId:SERVER_PERSONA[opts.persona??'calm'],emotion:opts.emotion??'neutral'});
    if (current !== generation) return;
    const pl = createAudioPlayer({ uri: absUrl(audio.audioUrl) });
    player = pl;
    let finished = false;
    pl.addListener('playbackStatusUpdate', (status) => {
      if (finished || current !== generation) return;
      if (status.error || status.didJustFinish) {
        finished = true;
        if (status.error) opts.onError?.(); else opts.onDone?.();
      }
    });
    pl.play();
  } catch {
    if (current === generation) opts.onError?.();
  }
}
export function stopSpeak() {
  generation++;
  player?.remove();
  player = null;
  // 이미 실행 중인 이전 버전의 기기 읽기도 중단한다.
  Speech.stop().catch(() => null);
}
