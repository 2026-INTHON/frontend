import { useCallback, useEffect, useState } from 'react';
import { currentUser, googleConfig, signInWithGoogle, signOut, LoginResult } from './auth';
import { MaloUser } from './tokens';

// 화면에서 쓰는 로그인 상태
export function useAccount() {
  const [user, setUser] = useState<MaloUser | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null); // null = 확인 중
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    currentUser().then(setUser);
    googleConfig().then((c) => setEnabled(c.enabled));
  }, []);

  const login = useCallback(async (): Promise<LoginResult> => {
    setBusy(true);
    setMsg(null);
    const r: LoginResult = await signInWithGoogle().catch(() => ({ ok: false as const, reason: 'error' as const, message: '네트워크를 확인해 주세요' })).finally(() => setBusy(false));
    if (r.ok) setUser(r.user);
    else if (r.reason === 'cancel') setMsg('로그인을 취소했어요. 게스트 기록은 그대로예요.');
    else if (r.reason === 'disabled') setMsg('Google 로그인은 준비 중이에요.');
    else if (r.reason === 'error') setMsg(r.message ?? '로그인하지 못했어요.');
    return r;
  }, []);

  const logout = useCallback(async () => {
    setBusy(true);
    await signOut();
    setUser(null);
    setBusy(false);
  }, []);

  return { user, enabled, busy, msg, login, logout };
}
