import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, ApiError, SessionReport } from '../lib/api';
import { C } from '../lib/theme';
import { Btn, Card, T } from './ui';
import { ReactionBadge } from './scene-parts';
import { useStore } from '../lib/store';
import { reportCopy } from '../lib/report-copy';

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

// Changing UI language remounts the report, so old-language content never flashes.
export function ReportCard({sessionId}:{sessionId:string}){
 const {lang}=useStore();
 return <LocalizedReportCard key={sessionId+':'+lang} sessionId={sessionId} lang={lang} />;
}
function LocalizedReportCard({sessionId,lang}:{sessionId:string;lang:string}){
 const copy=reportCopy(lang),visible=useVisible();
 const [rep,setRep]=useState<SessionReport|null>(null),[err,setErr]=useState(false);
 const [tick,setTick]=useState(0),[action,setAction]=useState<'load'|'retry'>('load');
 const [open,setOpen]=useState<string|null>(null);
 useEffect(()=>{
  if(!visible)return;
  let alive=true,first=true,timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{
   try{
    let r:SessionReport;
    if(first&&action==='retry')r=await api.retryReport(sessionId,lang);
    else try{r=await api.report(sessionId,lang);}catch(e){
     if(e instanceof ApiError&&e.status===404)r=await api.makeReport(sessionId,lang);else throw e;
    }
    first=false;
    if(!alive)return;
    if(r.report&&r.report.language!==lang)throw new Error('REPORT_LANGUAGE_MISMATCH');
    setRep(r);setErr(false);
    if(r.status==='queued'||r.status==='running')timer=setTimeout(load,4000);
   }catch{if(alive)setErr(true);}
  };
  load();return()=>{alive=false;clearTimeout(timer);};
 },[sessionId,lang,visible,tick,action]);
 const retry=(failed=false)=>{setErr(false);setAction(failed?'retry':'load');setTick(x=>x+1);};
 if(err)return <Card style={{gap:8}}><T s="label">{copy.error}</T><Btn small kind="line" label={copy.retry} onPress={()=>retry()} /></Card>;
 if(!rep||rep.status==='queued'||rep.status==='running')return <Card style={{flexDirection:'row',alignItems:'center',gap:10}}><ActivityIndicator color={C.ink}/><View style={{flex:1}}><T s="label">{copy.loading}</T><T s="small">{copy.background}</T></View></Card>;
 if(rep.status==='failed'||!rep.report)return <Card style={{gap:8}}><T s="label">{copy.failed}</T>{rep.error?.retryable!==false?<Btn small kind="line" label={copy.regenerate} onPress={()=>retry(true)}/>:null}</Card>;
 const r=rep.report,sm=r.summary??{};
 return <Card style={{gap:18}}>
  <View style={{gap:6}}><T s="label">{copy.title}</T>{sm.headline?<T s="h3">{sm.headline}</T>:null}{sm.overallFeedback?<T s="sub">{sm.overallFeedback}</T>:null}</View>
  <Section title={copy.strengths} items={sm.strengths} empty={copy.empty}/>
  <Section title={copy.improvements} items={sm.improvements} empty={copy.empty}/>
  <Section title={copy.shortcomings} items={sm.shortcomings} empty={copy.empty}/>
  <Section title={copy.culture} items={sm.culturalTakeaways} empty={copy.empty}/>
  {r.details?.length?<View style={{gap:10,borderTopWidth:1,borderColor:C.line,paddingTop:16}}>
   <T s="label">{copy.details} · {r.details.length}</T>
   {r.details.map((d,i)=>{
    const expanded=open===d.turnId;
    return <View key={d.turnId} style={{backgroundColor:C.bg,borderRadius:16,overflow:'hidden'}}>
     <Pressable accessibilityRole="button" accessibilityLabel={`${copy.turn} ${i+1}`} accessibilityState={{expanded}} onPress={()=>setOpen(expanded?null:d.turnId)} style={{padding:14,gap:8,minHeight:48}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>{d.evaluation?.mark?<ReactionBadge mark={d.evaluation.mark} size={24}/>:null}<T s="label" style={{flex:1}}>{copy.turn} {i+1}</T><Feather name={expanded?'chevron-up':'chevron-down'} size={18}/></View>
      <T s="body" numberOfLines={expanded?undefined:2}>{d.learnerText}</T>
     </Pressable>
     {expanded?<View style={{padding:14,paddingTop:0,gap:14}}>
      <Section title={copy.partner} items={d.npcText?[d.npcText]:[]}/>
      {d.comparison?<Section title={copy.first} items={[d.comparison.firstAnswer]}/>:null}
      <Section title={copy.intent} items={d.implicitIntent?[d.implicitIntent]:[]}/>
      <Section title={copy.strengths} items={d.coaching?.strengths}/>
      <Section title={copy.improvements} items={d.coaching?.improvements}/>
      <Section title={copy.shortcomings} items={d.coaching?.shortcomings}/>
      {d.alternativeExpression?<View style={{borderLeftWidth:3,borderColor:C.lime,paddingLeft:10}}><Section title={copy.example} items={[d.alternativeExpression]}/></View>:null}
      <Section title={copy.culture} items={d.culturalContext?[d.culturalContext]:[]}/>
     </View>:null}
    </View>;
   })}
  </View>:null}
 </Card>;
}
function Section({title,items,empty}:{title:string;items?:string[];empty?:string}){
 if(!items?.length&&!empty)return null;
 return <View style={{gap:5}}><T s="label">{title}</T>{items?.length?items.map((text,i)=><T key={i} s="sub" style={{color:C.ink}}>{text}</T>):<T s="small">{empty}</T>}</View>;
}
