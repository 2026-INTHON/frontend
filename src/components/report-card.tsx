import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, ApiError, SessionReport } from '../lib/api';
import { C } from '../lib/theme';
import { Btn, Card, T } from './ui';
import { ReactionBadge } from './scene-parts';
import { useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { subtitleText } from '../lib/learning-copy';

// 화면이 보이는지 (웹: 탭 숨김, 앱: 백그라운드) — 숨겨지면 조회를 멈춰요
function useVisible() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setV(s === 'active'));
    const onVis = () => setV(document.visibilityState === 'visible');
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return v;
}

// 완료 보고서: 결과 화면을 막지 않고 아래에서 따로 준비돼요 (FE_INTEGRATION 「완료 보고서와 자세히 보기」)
export function ReportCard({ sessionId }: { sessionId: string }) {
  const { lang } = useStore();
  const visible = useVisible();
  const [rep, setRep] = useState<SessionReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const tt = useT();
  const pending = !rep || rep.status === 'queued' || rep.status === 'running';

  useEffect(() => {
    if (!visible || !pending) return;
    let alive = true;
    const get = async () => {
      try {
        let r: SessionReport;
        try {
          r = await api.report(sessionId);
        } catch (e) {
          // 404 = 아직 요청 안 함 → 완료 세션이면 생성 요청 (조회만으로는 생성되지 않아요)
          if (e instanceof ApiError && e.status === 404) r = await api.makeReport(sessionId);
          else throw e;
        }
        if (alive) {
          setRep(r);
          setErr(null);
        }
      } catch {
        if (alive) setErr(tt('보고서를 불러오지 못했어요.'));
      }
    };
    get();
    const iv = setInterval(get, 4000); // 보이는 동안만 4초마다
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [sessionId, visible, pending, tick, tt]);

  if (err && !rep) {
    return (
      <Card style={{ gap: 8 }}>
        <T s="label">{err}</T>
        <Btn label={tt('다시 시도')} small kind="line" onPress={() => { setErr(null); setTick((t) => t + 1); }} />
      </Card>
    );
  }
  if (pending) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={C.ink} />
        <View style={{ flex: 1 }}>
          <T s="label">{tt('대화별 상세 보고서 만드는 중…')}</T>
          <T s="small">{tt('다른 장면을 해도 계속 만들어져요')}</T>
        </View>
      </Card>
    );
  }
  if (rep!.status === 'failed' || !rep!.report) {
    return (
      <Card style={{ gap: 8 }}>
        <T s="label">{tt('상세 보고서를 만들지 못했어요')}</T>
        {rep!.error?.retryable !== false ? (
          <Btn label={tt('다시 만들기')} small kind="line" icon="rotate-cw" onPress={() => api.retryReport(sessionId).then(setRep).catch(() => setErr(tt('다시 요청하지 못했어요.')))} />
        ) : null}
      </Card>
    );
  }
  const r = rep!.report!;
  const sm = r.summary ?? {};
  return (
    <Card style={{ gap: 10 }}>
      <T s="label">{tt('상세 보고서')}{r.provisional ? ` · ${tt('연습 지표')}` : ''}</T>
      {sm.headline ? <T s="h3">{sm.headline}</T> : null}
      {sm.overallFeedback ? <T s="sub" style={{ color: C.ink }}>{sm.overallFeedback}</T> : null}
      <Bullets t={tt('잘한 점')} items={sm.strengths} />
      <Bullets t={tt('더 좋아질 점')} items={sm.improvements} />
      <Bullets t={tt('문화 팁')} items={sm.culturalTakeaways} />
      {r.details?.length ? (
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12 }}>
          <Feather name="list" size={16} />
          <T s="label" style={{ flex: 1 }}>{tt('대화별 자세히 보기')} ({r.details.length})</T>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>
      ) : null}
      {open
        ? r.details!.map((d, i) => (
            <View key={d.turnId + i} style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12, gap: 6 }}>
              {d.npcText ? <T s="small">{tt('상대')}: "{d.npcText}"</T> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {d.evaluation?.mark ? <ReactionBadge mark={d.evaluation.mark} size={22} /> : <T s="small">{tt('판정 없음')}</T>}
                <T s="body" style={{ flex: 1 }}>"{d.learnerText}"</T>
              </View>
              {d.comparison ? <T s="small">{tt('처음 답')}: "{d.comparison.firstAnswer}"</T> : null}
              {d.evaluation?.reason ? <T s="sub">{d.evaluation.reason}</T> : null}
              {d.praise ? <T s="sub" style={{ color: C.ink }}>{tt('잘한 점')}: {d.praise}</T> : null}
              {d.implicitIntent ? <T s="small">{tt('상대의 속뜻')}: {d.implicitIntent}</T> : null}
              {d.culturalContext ? <T s="small">{tt('문화 맥락')}: {d.culturalContext}</T> : null}
              {d.feedback ? <T s="sub">{d.feedback}</T> : null}
              {d.feedbackTranslation ? <T s="small">{typeof d.feedbackTranslation === 'string' ? (r.language === lang ? d.feedbackTranslation : null) : subtitleText(d.feedbackTranslation, lang)}</T> : null}
              {d.alternativeExpression ? (
                <View style={{ borderLeftWidth: 3, borderLeftColor: C.lime, paddingLeft: 8 }}>
                  <T s="small">{tt('이렇게도 말해요')}</T>
                  <T s="body">"{d.alternativeExpression}"</T>
                </View>
              ) : null}
              {d.practiceTip ? <T s="small">{tt('연습 팁')}: {d.practiceTip}</T> : null}
            </View>
          ))
        : null}
    </Card>
  );
}

function Bullets({ t, items }: { t: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <View style={{ gap: 2 }}>
      <T s="small">{t}</T>
      {items.map((x, i) => (
        <T key={i} s="body">· {x}</T>
      ))}
    </View>
  );
}
