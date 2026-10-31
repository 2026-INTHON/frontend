import { Platform } from 'react-native';
import { api } from './api';
import { getTokens } from './tokens';

// 웹앱 완료 알림 (FE_INTEGRATION 「웹앱 완료 알림」)
// Android Chrome, iOS 16.4+ '홈 화면에 추가'한 웹앱에서 동작. 권한은 사용자가 버튼을 눌렀을 때만 물어요.
const KEY = 'malo.push';
type Saved = { id: string; userId: string | null };

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

export function pushSupported() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

const saved = (): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const s = saved();
  const me = (await getTokens())?.user?.id ?? null;
  return s && s.userId === me && Notification.permission === 'granted' ? 'on' : 'off';
}

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// 버튼을 눌렀을 때만 호출하세요
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: '이 브라우저는 알림을 지원하지 않아요. 아이폰은 홈 화면에 추가한 뒤 열어 주세요.' };
  if (Notification.permission === 'denied') return { ok: false, reason: '알림이 차단돼 있어요. 브라우저 설정에서 허용해 주세요.' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: '알림을 허용하지 않았어요. 앱을 열면 진행 상황을 다시 확인할 수 있어요.' };
  try {
    const cfg = await api.pushConfig();
    if (!cfg.enabled || !cfg.publicKey) return { ok: false, reason: '서버 알림이 아직 꺼져 있어요.' };
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) }));
    const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const res = await api.pushSubscribe({ endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } });
    const me = (await getTokens())?.user?.id ?? null;
    localStorage.setItem(KEY, JSON.stringify({ id: res.id, userId: me }));
    return { ok: true };
  } catch {
    return { ok: false, reason: '알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
  }
}

// 로그아웃·알림 해제 때: 서버 구독 삭제 → 브라우저 구독 해제
export async function disablePush() {
  if (!pushSupported()) return;
  const s = saved();
  if (s?.id) await api.pushUnsubscribe(s.id).catch(() => null);
  localStorage.removeItem(KEY);
  const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => undefined);
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => null);
}
