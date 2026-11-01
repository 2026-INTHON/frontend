import { Platform } from 'react-native';
import { api } from './api';

export type PreparedExport = { save: () => Promise<'saved'|'downloaded'|'shared'|'cancelled'>; dispose: () => void };

// Web streams directly to the browser's download manager. Native prepares before sharing.
export async function prepareExport(id:string,format:'video'|'pdf'):Promise<PreparedExport>{
  let link=await api.exportDownload(id),createdAt=Date.now();
  if(Platform.OS==='web'){
    return {dispose:()=>{},save:async()=>{
      // Tickets expire after 10 minutes; reports can stay open much longer.
      if(Date.now()-createdAt>=9*60*1000){link=await api.exportDownload(id);createdAt=Date.now();}
      const a=document.createElement('a');a.href=link.url;a.download=link.filename;a.referrerPolicy='no-referrer';
      document.body.appendChild(a);a.click();a.remove();return 'downloaded';
    }};
  }
  const {File:NativeFile,Paths}=await import('expo-file-system');
  const destination=new NativeFile(Paths.cache,link.filename);
  const file=destination.exists?destination:await NativeFile.downloadFileAsync(link.url,destination);
  return {dispose:()=>{},save:async()=>{
    if(format==='video'){
      const {Asset,requestPermissionsAsync}=await import('expo-media-library');
      const permission=await requestPermissionsAsync(true,['video']);
      if(!permission.granted)throw new Error('GALLERY_PERMISSION');
      await Asset.create(file.uri);return 'saved';
    }
    const sharing=await import('expo-sharing');
    if(!await sharing.isAvailableAsync())throw new Error('SHARING_UNAVAILABLE');
    await sharing.shareAsync(file.uri,{mimeType:'application/pdf',UTI:'com.adobe.pdf'});return 'shared';
  }};
}
