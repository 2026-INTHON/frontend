import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,Platform,View} from 'react-native';
import {api,LearningExport} from '../lib/api';
import {prepareExport,PreparedExport} from '../lib/export-file';
import {useLang,useT} from '../lib/i18n';
import {Btn,Card,T} from './ui';

export function ExportCard({sessionId}:{sessionId:string}){
 const t=useT(),lang=useLang();
 return <Card style={{gap:14}}>
  <T s="h3">{t('학습 저장하기')}</T>
  <T s="small">{t('영상에는 전체 대화·캐릭터 반응·점수가 담겨요. 내 답변은 텍스트로 저장돼요.')}</T>
  {(['video','pdf'] as const).map(format=><ExportRow key={`${sessionId}:${lang}:${format}`} sessionId={sessionId} language={lang} format={format}/>)}
  {Platform.OS==='web'?<T s="small">{t('완성된 영상은 공유 메뉴에서 저장하거나 파일로 다운로드할 수 있어요.')}</T>:null}
 </Card>;
}
function ExportRow({sessionId,language,format}:{sessionId:string;language:string;format:'video'|'pdf'}){
 const t=useT(),[job,setJob]=useState<LearningExport|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[prepared,setPrepared]=useState<PreparedExport|null>(null),[attempt,setAttempt]=useState(0);
 const alive=useRef(true),locked=useRef(false);
 useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
 useEffect(()=>{
  let gone=false,timer:ReturnType<typeof setTimeout>|undefined;
  async function refresh(){
   try{
    if(AppState.currentState!=='background'&&(Platform.OS!=='web'||document.visibilityState!=='hidden')){
     const items=await api.exports(sessionId,language);if(gone)return;
     const found=items.find(x=>x.format===format)||null;setJob(found);setLoading(false);setError(e=>e==='상태를 확인하지 못했어요. 다시 시도해 주세요.'?'':e);
     if(!found||['ready','failed'].includes(found.status))return;
    }
   }catch{if(!gone){setError('상태를 확인하지 못했어요. 다시 시도해 주세요.');setLoading(false);}}
   if(!gone)timer=setTimeout(refresh,4000);
  }
  void refresh();return ()=>{gone=true;clearTimeout(timer);};
 },[sessionId,language,format,attempt]);
 useEffect(()=>{
  if(job?.status!=='ready')return;
  let gone=false,asset:PreparedExport|undefined;
  prepareExport(job.id,format).then(file=>{asset=file;if(gone)file.dispose();else{setPrepared(file);setError('');}}).catch(()=>{if(!gone)setError('파일을 준비하지 못했어요. 다시 시도해 주세요.');});
  return ()=>{gone=true;asset?.dispose();};
 },[job?.id,job?.status,format,attempt]);
 async function start(){
  if(locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');
  try{const next=await api.makeExport(sessionId,format,language,true);if(alive.current){setJob(next);setAttempt(x=>x+1);}}
  catch{if(alive.current)setError('내보내기를 시작하지 못했어요. 다시 시도해 주세요.');}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 async function save(){
  if(!prepared||locked.current)return;locked.current=true;setBusy(true);setError('');
  try{const result=await prepared.save();if(alive.current)setMessage(result==='saved'?'갤러리에 저장했어요.':result==='downloaded'?'다운로드를 시작했어요.':result==='shared'?'공유 창을 열었어요.':'');}
  catch(e){if(alive.current)setError((e as Error).message==='GALLERY_PERMISSION'?'기기 설정에서 사진 추가 권한을 허용한 뒤 다시 눌러 주세요.':'파일을 저장하지 못했어요. 다시 시도해 주세요.');}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 const pending=job&&['queued','running'].includes(job.status);
 const preparing=job?.status==='ready'&&!prepared&&!error;
 const label=job?.status==='ready'?(format==='video'?(Platform.OS==='web'?'영상 저장 / 공유':'갤러리에 영상 저장'):'PDF 저장 / 공유'):(job?.status==='failed'?'다시 만들기':format==='video'?'전체 대화 영상 만들기':'리포트 PDF 만들기');
 return <View style={{gap:8}}>
  <T s="label">{format==='video'?t('전체 대화 영상 · MP4'):t('최종 리포트 · PDF')}</T>
  {pending||loading||busy||preparing?<View style={{flexDirection:'row',gap:8,alignItems:'center'}} accessibilityLiveRegion="polite"><ActivityIndicator/><T s="small" style={{flex:1}}>{t(pending?'만드는 중이에요. 다른 학습을 해도 괜찮아요.':'파일 준비 중…')}</T></View>:null}
  {job?.status==='failed'?<View accessibilityRole="alert"><T s="small">{t('파일 생성에 실패했어요. 다시 만들 수 있어요.')}</T></View>:null}
  {error?<View style={{gap:8}} accessibilityRole="alert"><T s="small">{t(error)}</T><Btn label={t('다시 시도')} small kind="line" onPress={()=>{setError('');setPrepared(null);setAttempt(x=>x+1);}}/></View>:null}
  {!pending?<Btn label={t(label)} kind={format==='video'?'dark':'line'} icon={format==='video'?'video':'file-text'} disabled={loading||busy||(job?.status==='ready'&&!prepared)} onPress={job?.status==='ready'?save:start}/>:null}
  {message?<View accessibilityLiveRegion="polite"><T s="small">{t(message)}</T></View>:null}
 </View>;
}
