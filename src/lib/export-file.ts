import { Platform } from 'react-native';
import { api } from './api';

export type PreparedExport = { save: () => Promise<'saved'|'downloaded'|'shared'|'cancelled'>; dispose: () => void };

// Prepare first, then share on a fresh user tap: Web Share requires user activation.
export async function prepareExport(id:string,format:'video'|'pdf'):Promise<PreparedExport>{
  const link=await api.exportDownload(id);
  if(Platform.OS==='web'){
    const response=await fetch(link.url);if(!response.ok)throw new Error('EXPORT_DOWNLOAD_FAILED');
    const blob=await response.blob();
    const file=new File([blob],link.filename,{type:link.mimeType}),url=URL.createObjectURL(file);
    return {dispose:()=>URL.revokeObjectURL(url),save:async()=>{
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        try{await navigator.share({files:[file],title:'Malo'});return 'shared';}
        catch(error){if((error as Error).name==='AbortError')return 'cancelled';}
      }
      const a=document.createElement('a');a.href=url;a.download=link.filename;document.body.appendChild(a);a.click();a.remove();return 'downloaded';
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
