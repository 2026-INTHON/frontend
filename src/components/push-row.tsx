import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { C } from '../lib/theme';
import { disablePush, enablePush, pushState, PushState } from '../lib/push';
import { T } from './ui';
import { useT } from '../lib/i18n';

// 설정 · 생성 화면에서 쓰는 '완료 알림 받기' 스위치 (웹앱 전용)
export function PushRow() {
  const [s, setS] = useState<PushState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();
  useEffect(() => {
    pushState().then(setS);
  }, []);
  if (s === null || s === 'unsupported') return null;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
        <T style={{ flex: 1, fontSize: 15 }}>{t('챕터·보고서 완료 알림')}</T>
        <Switch
          value={s === 'on'}
          disabled={busy || s === 'denied'}
          onValueChange={async (v) => {
            setBusy(true);
            setMsg(null);
            if (v) {
              const r = await enablePush();
              if (!r.ok) setMsg(r.reason ?? null);
            } else await disablePush();
            setS(await pushState());
            setBusy(false);
          }}
          trackColor={{ true: C.ink, false: C.line }}
          thumbColor={C.white}
          {...({ activeThumbColor: C.lime, activeTrackColor: C.ink } as any)}
        />
      </View>
      {s === 'denied' ? <T s="small">{t('알림이 차단돼 있어요. 브라우저 설정에서 허용해 주세요.')}</T> : msg ? <T s="small">{t(msg)}</T> : null}
    </View>
  );
}
