import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api, GenerationJob } from './api';

// 생성 작업 목록: 화면이 보이는 동안만 4초마다 조회, 돌아오면 바로 다시 조회.
// 서버 작업은 화면을 닫아도 계속돼요. FE 타이머로 작업을 돌리지 않아요.
export function useGenerationJobs(enabled: boolean, onReady?: (job: GenerationJob) => void) {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [visible, setVisible] = useState(true);
  const seen = useRef<Record<string, string>>({});
  const readyCb = useRef(onReady);
  useEffect(() => {
    readyCb.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setVisible(s === 'active'));
    const onVis = () => setVisible(document.visibilityState === 'visible');
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await api.generations();
      // 이번에 ready 가 된 작업만 알려요 (챕터 목록 다시 불러오기)
      list.forEach((j) => {
        const prev = seen.current[j.id];
        if (j.status === 'ready' && prev && prev !== 'ready') readyCb.current?.(j);
        seen.current[j.id] = j.status;
      });
      setJobs(list);
    } catch {
      /* 조회 실패는 다음 주기에 다시 */
    }
  }, []);

  const active = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  useEffect(() => {
    if (!enabled || !visible) return;
    let alive = true;
    const run = () => alive && refresh();
    run();
    const iv = active ? setInterval(run, 4000) : null;
    return () => {
      alive = false;
      if (iv) clearInterval(iv);
    };
  }, [enabled, visible, active, refresh]);

  return { jobs, refresh, setJobs };
}
