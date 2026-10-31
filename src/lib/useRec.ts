import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

// 녹음만 담당. 끝나면 파일 주소(uri)를 돌려줘요. 실시간 받아쓰기는 하지 않아요.
export function useRec() {
  const rec = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const st = useAudioRecorderState(rec, 120);

  async function start(): Promise<boolean> {
    try {
      const p = await requestRecordingPermissionsAsync();
      if (!p.granted) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync();
      rec.record();
      return true;
    } catch {
      return true; // 웹 등에서 녹음이 안 돼도 화면 흐름은 보여 줘요
    }
  }

  async function stop(): Promise<string | null> {
    try {
      await rec.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      return rec.uri ?? null;
    } catch {
      return null;
    }
  }

  return { start, stop, ms: st.durationMillis ?? 0, level: st.metering ?? -60 };
}
