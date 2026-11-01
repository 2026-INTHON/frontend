// The browser records the real tab. No replay renderer, upload, or TTS regeneration.
type CaptureTrack = MediaStreamTrack & { getCaptureHandle?: () => { handle: string } | null; cropTo?: (target: unknown) => Promise<void> };
type CaptureDevices = MediaDevices & { setCaptureHandleConfig?: (config: { handle: string; permittedOrigins: string[] }) => void };
export type RecordingState = {
  phase: 'idle' | 'starting' | 'recording' | 'stopping' | 'ready' | 'error';
  owner: string; route: string; startedAt: number;
  url: string; mime: string; bytes: number; error: string; notice: string; downloaded: boolean; microphoneActive: boolean;
};
const empty = (): RecordingState => ({ phase: 'idle', owner: '', route: '', startedAt: 0, url: '', mime: '', bytes: 0, error: '', notice: '', downloaded: false, microphoneActive: false });
type Capture = {
  streams: MediaStream[]; context?: AudioContext; recorder?: MediaRecorder; chunks: Blob[];
  released: boolean; mic?: MediaStream; micGain?: GainNode;
  done?: Promise<void>; resolve?: () => void;
};
export function screenRecordingSupported() {
  return typeof window !== 'undefined' && window.isSecureContext &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    typeof MediaRecorder !== 'undefined' && typeof AudioContext !== 'undefined';
}

export class ScreenRecorder {
  private state = empty();
  private listeners = new Set<() => void>();
  private capture?: Capture;
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(patch: Partial<RecordingState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private release(c: Capture) {
    if (c.micGain) c.micGain.gain.value = 0;
    c.released = true;
    c.streams.forEach(s => s.getTracks().forEach(t => t.stop()));
    if (c.context && c.context.state !== 'closed') void c.context.close().catch(() => {});
  }
  private keep(c: Capture, stream: MediaStream) {
    c.streams.push(stream);
    if (c.released || c !== this.capture) { stream.getTracks().forEach(t => t.stop()); throw new Error('cancelled'); }
    return stream;
  }

  async start(owner: string, route: string): Promise<boolean> {
    if (!['idle', 'error'].includes(this.state.phase)) return false;
    if (!screenRecordingSupported()) { this.update({ phase: 'error', error: '이 브라우저에서는 앱 녹화를 지원하지 않아요. PC Chrome·Edge 또는 기기의 화면 녹화를 사용해 주세요.' }); return false; }
    const c: Capture = { streams: [], chunks: [], released: false };
    this.capture = c;
    this.update({ ...empty(), phase: 'starting', owner, route });
    try {
      const devices = navigator.mediaDevices as CaptureDevices;
      const handle = crypto.randomUUID();
      devices.setCaptureHandleConfig?.({ handle, permittedOrigins: [location.origin] });
      // Call directly from the button gesture, before any await.
      const display = this.keep(c, await devices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: { ideal: 30, max: 30 } },
        audio: { suppressLocalAudioPlayback: false }, preferCurrentTab: true,
        selfBrowserSurface: 'include', surfaceSwitching: 'exclude', monitorTypeSurfaces: 'exclude', systemAudio: 'exclude',
      } as DisplayMediaStreamOptions));
      const video = display.getVideoTracks()[0] as CaptureTrack;
      if (!video || video.getSettings().displaySurface !== 'browser' ||
          (devices.setCaptureHandleConfig && video.getCaptureHandle && video.getCaptureHandle()?.handle !== handle)) {
        throw new Error('현재 Malo 탭을 선택해 주세요. 다른 탭이나 전체 화면은 녹화하지 않아요.');
      }
      if (!display.getAudioTracks().length) throw new Error('탭 오디오 공유를 켜고 다시 시작해 주세요. 캐릭터 목소리를 함께 녹화하려면 필요해요.');
      video.addEventListener('ended', () => { if (this.capture === c) void this.stop(); });
      video.addEventListener('capturehandlechange', () => {
        if (video.getCaptureHandle?.()?.handle !== handle && this.capture === c) void this.stop();
      });
      let mic: MediaStream;
      try {
        mic = this.keep(c, await devices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }));
        // Closed before connecting to the graph: no ambient audio before a speaking turn.
        mic.getAudioTracks().forEach(track => { track.enabled = false; });
        c.mic = mic;
      }
      catch (e) { if (c.released) throw e; throw new Error('마이크를 허용한 뒤 다시 시작해 주세요. 내 목소리는 말하기 버튼을 켠 동안만 녹화해요.'); }
      const crop = (globalThis as typeof globalThis & { CropTarget?: { fromElement: (el: Element) => Promise<unknown> } }).CropTarget;
      const frame = document.getElementById('malo-recording-frame');
      if (crop && video.cropTo && frame) {
        try { await video.cropTo(await crop.fromElement(frame)); } catch { /* Full tab remains an actual screen recording. */ }
      }
      if (c.released) throw new Error('cancelled');
      c.context = new AudioContext();
      await c.context.resume();
      if (c.released) throw new Error('cancelled');
      const mix = c.context.createMediaStreamDestination();
      c.context.createMediaStreamSource(display).connect(mix);
      c.micGain = c.context.createGain();
      c.micGain.gain.value = 0;
      c.context.createMediaStreamSource(mic).connect(c.micGain);
      c.micGain.connect(mix);
      const stream = this.keep(c, new MediaStream([video, ...mix.stream.getAudioTracks()]));
      // Prefer VP8 for live tab capture. Do not force a low H.264 level on a
      // high-DPI/cropped source, whose resolution can change during recording.
      const mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(x => MediaRecorder.isTypeSupported(x));
      if (!mime) throw new Error('이 브라우저에서는 앱 녹화를 지원하지 않아요. PC Chrome·Edge 또는 기기의 화면 녹화를 사용해 주세요.');
      const recorder = c.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000 });
      c.done = new Promise(resolve => { c.resolve = resolve; });
      recorder.ondataavailable = event => {
        if (event.data.size) { c.chunks.push(event.data); this.update({ bytes: this.state.bytes + event.data.size }); }
        if (this.state.bytes >= 512 * 1024 * 1024 && this.state.phase === 'recording') {
          this.update({ notice: '녹화 용량 한도에 도달해 중지했어요. 지금까지의 영상을 저장해 주세요.' }); void this.stop();
        }
      };
      recorder.onerror = () => { this.update({ notice: '녹화가 중단됐어요. 저장된 부분을 확인해 주세요.' }); void this.stop(); };
      recorder.onstop = () => {
        this.release(c);
        const blob = new Blob(c.chunks, { type: recorder.mimeType || mime });
        c.chunks.length = 0;
        this.update(blob.size ? { phase: 'ready', url: URL.createObjectURL(blob), mime: blob.type, bytes: blob.size, microphoneActive: false } : { phase: 'error', error: '녹화된 영상이 없어요. 다시 시작해 주세요.', microphoneActive: false });
        c.resolve?.();
      };
      // Stop if either audio source disappears; never silently produce a muted remainder.
      [...display.getAudioTracks(), ...mic.getAudioTracks()].forEach(track => track.addEventListener('ended', () => {
        if (!c.released && this.capture === c) { this.update({ notice: '음성 연결이 끊겨 녹화를 중지했어요. 지금까지의 영상을 저장해 주세요.' }); void this.stop(); }
      }));
      recorder.start(1000);
      this.update({ phase: 'recording', startedAt: Date.now(), mime: recorder.mimeType || mime });
      return true;
    } catch (e) {
      this.release(c);
      if (this.capture === c && this.state.phase === 'starting') {
        const error = e as Error;
        this.update({ phase: 'error', error: ['NotAllowedError', 'AbortError'].includes(error.name) ? '녹화 시작을 취소했어요. 원할 때 다시 시작할 수 있어요.' : error.name === 'Error' ? error.message : '녹화를 시작하지 못했어요. PC Chrome·Edge에서 다시 시도해 주세요.' });
      }
      return false;
    }
  }

  // Only the owning scene's actual speaking interval can open the microphone gate.
  // Disable both the track and gain synchronously, before STT/finalization awaits.
  setMicrophoneActive(owner: string, active: boolean) {
    const c = this.capture;
    if (owner !== this.state.owner || this.state.phase !== 'recording' || !c || c.released) return;
    c.mic?.getAudioTracks().forEach(track => { track.enabled = active; });
    if (c.micGain) c.micGain.gain.value = active ? 1 : 0;
    if (this.state.microphoneActive !== active) this.update({ microphoneActive: active });
  }

  async stop() {
    const c = this.capture;
    if (!c) return;
    if (this.state.phase === 'starting') { this.release(c); this.update(empty()); return; }
    if (this.state.phase === 'stopping') return c.done;
    if (this.state.phase !== 'recording') return;
    this.setMicrophoneActive(this.state.owner, false);
    this.update({ phase: 'stopping' });
    if (c.recorder?.state !== 'inactive') c.recorder?.stop();
    this.release(c);
    await c.done;
  }

  download() {
    if (this.state.phase !== 'ready' || !this.state.url) return;
    const a = document.createElement('a');
    a.href = this.state.url;
    a.download = `malo-recording-${new Date(this.state.startedAt).toISOString().replace(/[:.]/g, '-')}.${this.state.mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(a); a.click(); a.remove();
    this.update({ downloaded: true });
  }
  discard() {
    if (!['ready', 'error', 'idle'].includes(this.state.phase)) return;
    if (this.state.url) URL.revokeObjectURL(this.state.url);
    this.capture = undefined; this.update(empty());
  }
  hasUnsaved() { return ['starting', 'recording', 'stopping'].includes(this.state.phase) || (this.state.phase === 'ready' && !this.state.downloaded); }
}
export const screenRecorder = new ScreenRecorder();
