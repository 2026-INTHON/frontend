import { Platform, Share } from 'react-native';

// 대화 내보내기: 대사·내 답·판정·자막 + 음성을 파일 하나(HTML)에 담아 공유해요.
// 음성은 서버 주소가 10분 뒤 만료돼서, 내보낼 때 받아서 파일 안에 넣어요. 못 받은 음성은 빼고 글만 남겨요.
export type ShareEntry = { who: 'char' | 'me'; name: string; text: string; sub?: string | null; mark?: string | null; audio?: string | null };
export type ShareDoc = { title: string; subtitle: string; date: string; entries: ShareEntry[]; labels: { me: string; audioMissing: string; footer: string } };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const MAX_AUDIO = 25 * 1024 * 1024; // 너무 커지지 않게 (넘으면 그 뒤 음성은 빼요)

async function toDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function transcriptText(d: ShareDoc) {
  return [d.title, d.subtitle, d.date, '', ...d.entries.map((e) => `${e.who === 'me' ? d.labels.me : e.name}${e.mark ? ` [${e.mark}]` : ''}: ${e.text}${e.sub ? `\n  (${e.sub})` : ''}`)].join('\n');
}

export async function buildHtml(d: ShareDoc) {
  let total = 0;
  const rows: string[] = [];
  for (const e of d.entries) {
    let audio = '';
    if (e.audio) {
      const data = total < MAX_AUDIO ? await toDataUrl(e.audio) : null;
      if (data) { total += data.length; audio = `<audio controls preload="none" src="${data}"></audio>`; }
      else audio = `<small class="miss">${esc(d.labels.audioMissing)}</small>`;
    }
    rows.push(`<div class="row ${e.who}"><div class="b"><div class="n">${esc(e.who === 'me' ? d.labels.me : e.name)}${e.mark ? ` <span class="m">${esc(e.mark)}</span>` : ''}</div><div class="t">${esc(e.text)}</div>${e.sub ? `<div class="s">${esc(e.sub)}</div>` : ''}${audio}</div></div>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.title)}</title>
<style>body{margin:0;background:#F3F2EE;font-family:-apple-system,'Noto Sans KR',sans-serif;color:#111}main{max-width:560px;margin:0 auto;padding:24px 16px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#6B6B6B;font-size:14px;margin-bottom:20px}.row{display:flex;margin:10px 0}.row.me{justify-content:flex-end}
.b{max-width:82%;background:#fff;border-radius:18px;padding:12px 14px}.me .b{background:#111;color:#fff}.n{font-size:12px;color:#6B6B6B;margin-bottom:4px}.me .n{color:#cfcfcf}
.t{font-size:16px;line-height:1.5;white-space:pre-wrap}.s{font-size:13px;color:#6B6B6B;margin-top:4px}.m{display:inline-block;background:#D4FF4F;color:#111;border-radius:8px;padding:0 6px;font-weight:700}
audio{width:100%;margin-top:8px;height:36px}.miss{color:#6B6B6B}footer{color:#6B6B6B;font-size:12px;margin-top:24px;text-align:center}</style></head>
<body><main><h1>${esc(d.title)}</h1><div class="sub">${esc(d.subtitle)} · ${esc(d.date)}</div>${rows.join('')}<footer>${esc(d.labels.footer)}</footer></main></body></html>`;
}

// 결과: 'shared' | 'downloaded' | 'text' (음성 없이 글만) | 'cancelled'
export async function shareConversation(d: ShareDoc): Promise<'shared' | 'downloaded' | 'text' | 'cancelled'> {
  const html = await buildHtml(d);
  const name = `malo-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.html`;
  if (Platform.OS === 'web') {
    const file = new File([html], name, { type: 'text/html' });
    const nav = navigator as Navigator & { canShare?: (x: unknown) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: d.title }); return 'shared'; } catch (err) { if ((err as Error)?.name === 'AbortError') return 'cancelled'; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  }
  try {
    const [{ File: FsFile, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
    const f = new FsFile(Paths.cache, name);
    if (f.exists) f.delete();
    f.create();
    f.write(html);
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(f.uri, { mimeType: 'text/html', dialogTitle: d.title, UTI: 'public.html' }); return 'shared'; }
  } catch { /* 아래 글만 공유로 */ }
  const r = await Share.share({ message: transcriptText(d), title: d.title });
  return r.action === Share.dismissedAction ? 'cancelled' : 'text';
}
