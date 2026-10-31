import {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Image, ImageSourcePropType, Platform, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {createAudioPlayer} from 'expo-audio';
import {C} from '../lib/theme';
import {Emotion} from '../lib/api';
import {reactionCopy} from '../lib/learning-copy';
import {T} from './ui';

const sounds = {
  happy:require('../../assets/sounds/reaction-happy.wav'),
  angry:require('../../assets/sounds/reaction-angry.wav'),
  sad:require('../../assets/sounds/reaction-sad.wav'),
  confused:require('../../assets/sounds/reaction-confused.wav'),
};

// The server's emotion drives the actor, independently of O/△/X/? learning marks.
export function CharacterActor({uri, fallback, emotion='neutral', eventKey, top, name, lang, sound, active}: {
  uri:string|null; fallback:ImageSourcePropType; emotion?:Emotion; eventKey:string; top:number; name:string; lang:string; sound:boolean; active:boolean;
}) {
  const [shown,setShown]=useState({uri:null as string|null,key:''});
  const [visible,setVisible]=useState(false);
  const [reduceMotion,setReduceMotion]=useState(true);
  const lastEvent=useRef('');
  const [actor]=useState(()=>new Animated.Value(1));
  const [bubble]=useState(()=>new Animated.Value(0));
  const native=Platform.OS!=='web';
  useEffect(()=>{
    let alive=true;
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive)setReduceMotion(v);}).catch(()=>{});
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
    return()=>{alive=false;listener.remove();};
  },[]);
  useEffect(()=>{
    let alive=true;
    const loaded=uri?Image.prefetch(uri):Promise.resolve(false);
    const show=(image:string|null)=>{if(alive){setShown({uri:image,key:eventKey});setVisible(!!eventKey);}};
    // RN resolves true; react-native-web resolves void on a successful prefetch.
    loaded.then(ok=>show(ok===false?null:uri)).catch(()=>show(null));
    return()=>{alive=false;};
  },[uri,eventKey]);
  useEffect(()=>{
    if(!active||!shown.key||shown.key===lastEvent.current)return;
    lastEvent.current=shown.key;
    actor.setValue(reduceMotion?1:0.65);
    bubble.setValue(reduceMotion?1:0);
    const animation=Animated.parallel([
      Animated.timing(actor,{toValue:1,duration:reduceMotion?0:220,useNativeDriver:native}),
      Animated.sequence([
        Animated.timing(bubble,{toValue:1,duration:reduceMotion?0:160,useNativeDriver:native}),
        Animated.delay(900),
        Animated.timing(bubble,{toValue:0,duration:reduceMotion?0:250,useNativeDriver:native}),
      ]),
    ]);
    animation.start(()=>setVisible(false));
    let player:ReturnType<typeof createAudioPlayer>|undefined;
    if(sound&&emotion!=='neutral'){
      try{player=createAudioPlayer(sounds[emotion]);player.volume=0.16;player.play();}catch{/* Decoration must not interrupt learning or voice playback. */}
    }
    return()=>{animation.stop();player?.remove();actor.setValue(1);bubble.setValue(0);};
  },[shown,emotion,active,sound,reduceMotion,actor,bubble,native]);
  const label=reactionCopy(lang)[emotion];
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.Image source={shown.uri?{uri:shown.uri}:fallback} onError={()=>setShown(old=>({...old,uri:null}))}
      style={{position:'absolute',top,alignSelf:'center',width:shown.uri?'100%':'62%',height:'72%',opacity:actor}}
      resizeMode="contain" accessibilityLabel={`${name} · ${label}`} />
    {visible&&active&&emotion!=='neutral'?<Animated.View accessible accessibilityLabel={`${name} · ${label}`} accessibilityLiveRegion="polite"
      style={{position:'absolute',top:top+80,right:'8%',width:66,minHeight:76,borderRadius:24,borderBottomLeftRadius:5,backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center',gap:4,paddingVertical:10,opacity:bubble,
        transform:reduceMotion?[]:[{scale:bubble.interpolate({inputRange:[0,1],outputRange:[0.72,1]})},{translateY:bubble.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}}>
      {emotion==='angry'?<T style={{fontSize:30,lineHeight:35}}>💢</T>:<Feather name={emotion==='happy'?'smile':emotion==='sad'?'droplet':'help-circle'} size={30} color={C.ink} />}
      <T style={{fontSize:11,lineHeight:16}}>{label}</T>
    </Animated.View>:null}
  </View>;
}
