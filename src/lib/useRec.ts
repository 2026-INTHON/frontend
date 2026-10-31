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
      return false; // 녹음을 못 켜면 실패로 알려요 (화면은 직접 입력으로 바꿔요)
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
