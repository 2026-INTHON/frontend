import { Platform } from 'react-native';
import { api } from './api';

// 웹 전용: 녹음하는 동안 바로 글자로 바꾸기 (FE_INTEGRATION 「음성 응답과 지연 시간」)
// 마이크 → 24kHz mono PCM16 → 150ms 단위 base64 → input_audio_buffer.append
// 끝내면 commit → committed.item_id 와 같은 completed 전사를 확정 문장으로 써요.
// 자격증명(value)은 메모리에만 두고 로그·localStorage 에 남기지 않아요.

const RATE = 24000;
const CHUNK_MS = 150;
const MAX_MS = 60000;

// AudioWorklet: 들어오는 소리를 그대로 메인 스레드로 넘겨요
const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('malo-tap', Tap);
`;

export const realtimeSupported = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && typeof WebSocket !== 'undefined' && typeof (window as any).AudioWorkletNode !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

function toB64(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  return btoa(s);
}

// 원래 샘플레이트 → 24kHz, Float32 → PCM16
function downsample(input: Float32Array, from: number): Int16Array {
  const ratio = from / RATE;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] ?? 0));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export class RealtimeTranscriber {
  private ws: WebSocket | null = null;
  private ready: Promise<void> | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private pending: Int16Array[] = [];
  private pendingLen = 0;
  private committedId: string | null = null;
  private done: Record<string, string> = {};
  private waiters: ((t: string) => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  preview = '';
  level = -60;
  onPreview?: (t: string) => void;
  onAutoStop?: () => void;

  constructor(private pack: string) {}

  // 녹음 전에 연결을 미리 준비해요
  prepare(): Promise<void> {
    if (this.ready && this.ws && this.ws.readyState <= 1) return this.ready;
    this.ready = (async () => {
      const cred = await api.realtimeSession(this.pack);
      await new Promise<void>((res, rej) => {
        const ws = new WebSocket(cred.websocketUrl, ['realtime', 'openai-insecure-api-key.' + cred.value]);
        this.ws = ws;
        const t = setTimeout(() => rej(new Error('timeout')), 8000);
        ws.onopen = () => {
          clearTimeout(t);
          res();
        };
        ws.onerror = () => {
          clearTimeout(t);
          rej(new Error('ws'));
        };
        ws.onclose = () => {
          this.ws = null;
          this.ready = null;
        };
        ws.onmessage = (m) => this.onEvent(m.data);
      });
    })();
    this.ready.catch(() => {
      this.ready = null;
    });
    return this.ready;
  }

  private onEvent(raw: any) {
    let e: any;
    try {
      e = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (e.type === 'input_audio_buffer.committed') this.committedId = e.item_id;
    else if (e.type?.endsWith('input_audio_transcription.delta')) {
      this.preview += e.delta ?? '';
      this.onPreview?.(this.preview);
    } else if (e.type?.endsWith('input_audio_transcription.completed')) {
      this.done[e.item_id] = e.transcript ?? '';
    }
    this.flushWaiters();
  }

  private flushWaiters() {
    if (this.committedId && this.done[this.committedId] !== undefined) {
      const t = this.done[this.committedId];
      this.waiters.splice(0).forEach((w) => w(t));
    }
  }

  async start() {
    await this.prepare();
    this.preview = '';
    this.committedId = null;
    this.done = {};
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx({ sampleRate: RATE }) as AudioContext;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'malo-tap');
    const from = this.ctx.sampleRate;
    const per = (RATE * CHUNK_MS) / 1000;
    this.node.port.onmessage = (ev) => {
      const f = ev.data as Float32Array;
      let sum = 0;
      for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
      this.level = 20 * Math.log10(Math.sqrt(sum / Math.max(1, f.length)) || 1e-6);
      const pcm = from === RATE ? downsample(f, RATE) : downsample(f, from);
      this.pending.push(pcm);
      this.pendingLen += pcm.length;
      if (this.pendingLen >= per) this.send();
    };
    src.connect(this.node);
    this.timer = setTimeout(() => this.onAutoStop?.(), MAX_MS); // 60초 안에서 끝내요
  }

  private send() {
    if (!this.pendingLen || !this.ws || this.ws.readyState !== 1) return;
    const all = new Int16Array(this.pendingLen);
    let o = 0;
    this.pending.forEach((p) => {
      all.set(p, o);
      o += p.length;
    });
    this.pending = [];
    this.pendingLen = 0;
    this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: toB64(all.buffer) }));
  }

  private stopMic() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => null);
    this.ctx = null;
  }

  // 녹음 끝 → commit → 확정 전사 (delta 는 미리보기일 뿐)
  async stop(): Promise<string> {
    this.send();
    this.stopMic();
    if (!this.ws || this.ws.readyState !== 1) throw new Error('closed');
    this.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    const text = await new Promise<string>((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 15000);
      this.waiters.push((x) => {
        clearTimeout(t);
        res(x);
      });
      this.flushWaiters();
    });
    this.close(); // 자격증명은 60초짜리라 매번 새로
    return text.trim();
  }

  close() {
    this.stopMic();
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.ready = null;
  }
}
