import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { usePathname } from 'expo-router';
import { screenRecorder, screenRecordingSupported } from '../lib/screen-recorder';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Btn, Card, IconBtn, Sheet, T } from './ui';

export const useScreenRecording = () => useSyncExternalStore(screenRecorder.subscribe, screenRecorder.getSnapshot, screenRecorder.getSnapshot);
const unsupported = '이 브라우저에서는 앱 녹화를 지원하지 않아요. PC Chrome·Edge 또는 기기의 화면 녹화를 사용해 주세요.';

export function SceneRecordingButton({ owner, route, onStarted }: { owner: string; route: string; onStarted: () => void }) {
  const s = useScreenRecording(), t = useT();
  const [open, setOpen] = useState(false);
  const recording = s.phase === 'recording';
  async function press() {
    if (recording) { await screenRecorder.stop(); setOpen(true); return; }
    if (['ready', 'starting', 'stopping'].includes(s.phase) || !screenRecordingSupported()) { setOpen(true); return; }
    if (await screenRecorder.start(owner, route)) onStarted();
    else setOpen(true);
  }
  return <>
    <IconBtn name={recording ? 'square' : s.phase === 'ready' ? 'download' : 'video'} size={36}
      bg={recording ? C.red : C.white} color={recording ? C.white : C.ink}
      label={t(recording ? '녹화 중지' : s.phase === 'ready' ? '녹화본 저장' : '화면 녹화 시작')} onPress={press} />
    <Sheet visible={open} onClose={() => setOpen(false)}>
      <RecordingControls owner={owner} route={route} onStarted={() => { setOpen(false); onStarted(); }} />
    </Sheet>
  </>;
}

export function RecordingControls({ owner, route, onStarted, result = false }: { owner?: string; route?: string; onStarted?: () => void; result?: boolean }) {
  const s = useScreenRecording(), t = useT();
  const [confirm, setConfirm] = useState(false), [preview, setPreview] = useState(false);
  const active = ['recording', 'starting', 'stopping'].includes(s.phase);
  const ready = s.phase === 'ready';
  const other = !!owner && !!s.owner && owner !== s.owner;
  const supported = Platform.OS === 'web' && screenRecordingSupported();
  return <View style={{ gap: 10 }}>
    <T s="h3">{t(ready ? '녹화본이 준비됐어요' : active ? '화면 녹화' : '화면 그대로 녹화')}</T>
    {other && (active || ready) ? <T s="small">{t('이전 대화의 녹화본이에요. 저장한 뒤 삭제하면 새로 녹화할 수 있어요.')}</T> : null}
    {s.phase === 'recording' ? <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} /><T s="label">{t('녹화 중')}</T>
      </View>
      <T s="small">{t(result ? '보고서 화면을 담은 뒤 자동으로 녹화를 마쳐요.' : '화면과 캐릭터 음성을 녹화 중이에요. 내 목소리는 말하기 버튼을 켠 동안만 담겨요.')}</T>
      <Btn small label={t('녹화 중지')} icon="square" kind="line" onPress={() => { void screenRecorder.stop(); }} />
    </> : null}
    {s.phase === 'starting' || s.phase === 'stopping' ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator /><T s="small">{t(s.phase === 'starting' ? '공유 화면과 마이크를 확인하고 있어요…' : '녹화를 마무리하고 있어요…')}</T></View>
      {s.phase === 'starting' ? <Btn small kind="ghost" label={t('취소')} onPress={() => { void screenRecorder.stop(); }} /> : null}
    </View> : null}
    {ready ? <>
      <T s="small">{(s.bytes / 1024 / 1024).toFixed(1)} MB · {s.mime.startsWith('video/mp4') ? 'MP4' : 'WebM'}</T>
      <Btn label={t('녹화본 저장')} icon="download" onPress={() => screenRecorder.download()} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small kind="line" label={t('미리 보기')} icon="play" style={{ flex: 1 }} onPress={() => setPreview(true)} />
        <Btn small kind="ghost" label={t('녹화본 삭제')} style={{ flex: 1 }} onPress={() => setConfirm(true)} />
      </View>
      {s.downloaded ? <View accessibilityLiveRegion="polite"><T s="small">{t('다운로드를 시작했어요. 브라우저의 다운로드 목록에서 확인해 주세요.')}</T></View> : null}
      <T s="small">{t('녹화본은 이 탭에만 있어요. 새로고침하거나 창을 닫기 전에 저장해 주세요.')}</T>
    </> : null}
    {!active && !ready ? result ? <T s="small">{t('이번 대화는 녹화하지 않았어요. 다음 대화에서는 상단의 녹화 아이콘을 눌러 주세요.')}</T> : <>
      <T s="small">{t(supported ? '현재 Malo 탭과 탭 오디오 공유를 선택해 주세요. 내 목소리는 말하기 시작부터 끝내기까지만 담겨요.' : unsupported)}</T>
      <Btn small icon="video" kind="line" disabled={!supported || !owner || !route} label={t('화면 녹화 시작')} onPress={() => {
        if (owner && route) void screenRecorder.start(owner, route).then(started => { if (started) onStarted?.(); });
      }} />
      {supported ? <T s="small">{t('녹화본은 서버에 업로드하지 않아요. 창을 닫기 전에 저장해 주세요.')}</T> : null}
    </> : null}
    {s.error ? <View accessibilityRole="alert"><T s="small" style={{ color: C.ink }}>{t(s.error)}</T></View> : null}
    {s.notice ? <View accessibilityLiveRegion="polite"><T s="small">{t(s.notice)}</T></View> : null}
    <Sheet visible={confirm} onClose={() => setConfirm(false)}>
      <T s="h3">{t('이 녹화본을 삭제할까요?')}</T>
      <T s="sub">{t('저장하지 않은 영상은 복구할 수 없어요.')}</T>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Btn label={t('취소')} kind="line" onPress={() => setConfirm(false)} />
        <Btn label={t('녹화본 삭제')} onPress={() => { setPreview(false); screenRecorder.discard(); setConfirm(false); }} />
      </View>
    </Sheet>
    <Sheet visible={preview} onClose={() => setPreview(false)}>
      <T s="h3">{t('녹화 미리 보기')}</T>
      {Platform.OS === 'web' && preview && s.url ? <video src={s.url} controls playsInline aria-label={t('녹화 미리 보기')} style={{ width: '100%', maxHeight: '60vh', marginTop: 12, borderRadius: 16, background: '#111' }} /> : null}
    </Sheet>
  </View>;
}

export function RecordingResult({ owner }: { owner?: string }) {
  const s = useScreenRecording();
  useEffect(() => {
    if (!owner || s.owner !== owner || s.phase !== 'recording') return;
    // Byte updates must not restart the three seconds after this report mounts.
    const timer = setTimeout(() => { void screenRecorder.stop(); }, 3000);
    return () => clearTimeout(timer);
  }, [owner, s.owner, s.phase]);
  // An old report must not claim to own another conversation's recording.
  if (s.owner && s.owner !== owner) return null;
  return <Card><RecordingControls owner={owner} result /></Card>;
}

export function RecordingBoundary() {
  const s = useScreenRecording(), path = usePathname(), { lastResult } = useStore(), t = useT();
  const [open, setOpen] = useState(false);
  const inRecording = path === s.route || (path === '/result' && lastResult?.recordingId === s.owner);
  useEffect(() => { if (!inRecording) void screenRecorder.stop(); }, [inRecording, path]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const unload = (e: BeforeUnloadEvent) => { if (screenRecorder.hasUnsaved()) { e.preventDefault(); e.returnValue = ''; } };
    const hide = () => { void screenRecorder.stop(); };
    window.addEventListener('beforeunload', unload); window.addEventListener('pagehide', hide);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('pagehide', hide); void screenRecorder.stop(); };
  }, []);
  if (inRecording || s.phase !== 'ready') return null;
  return <View style={{ padding: 10, backgroundColor: C.white, borderTopWidth: 1, borderColor: C.line }}>
    <Btn small label={t('녹화본 저장')} icon="video" onPress={() => setOpen(true)} />
    <Sheet visible={open} onClose={() => setOpen(false)}><RecordingControls /></Sheet>
  </View>;
}
