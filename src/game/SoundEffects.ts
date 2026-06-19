const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('testMode') === '1';

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private bgLoopGain: GainNode | null = null;
  private currentLoopIndex: number = 0;
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('rockstar-muted') === 'true';
      this.isMusicMuted = localStorage.getItem('rockstar-music-muted') === 'true';
      this.isSfxMuted = localStorage.getItem('rockstar-sfx-muted') === 'true';
    }
  }

  private init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.isInitialized = true;
        this.startBackgroundLoop();
      }
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume(): void {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(err => console.warn('Could not resume AudioContext:', err));
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rockstar-muted', String(this.isMuted));
    }
    const t = this.ctx?.currentTime ?? 0;
    if (this.isMuted) {
      if (this.bgLoopGain) this.bgLoopGain.gain.setValueAtTime(0, t);
    } else {
      this.resume();
      const vol = this.isMusicMuted ? 0 : 0.015;
      if (this.bgLoopGain) this.bgLoopGain.gain.setValueAtTime(vol, t);
    }
    return this.isMuted;
  }

  toggleMusicMuted(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rockstar-music-muted', String(this.isMusicMuted));
    }
    const t = this.ctx?.currentTime ?? 0;
    if (this.isMuted || this.isMusicMuted) {
      if (this.bgLoopGain) this.bgLoopGain.gain.setValueAtTime(0, t);
    } else {
      this.resume();
      if (this.bgLoopGain) this.bgLoopGain.gain.setValueAtTime(0.015, t);
    }
    return this.isMusicMuted;
  }

  toggleSfxMuted(): boolean {
    this.isSfxMuted = !this.isSfxMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rockstar-sfx-muted', String(this.isSfxMuted));
    }
    return this.isSfxMuted;
  }

  getMusicMuted(): boolean {
    return this.isMusicMuted;
  }

  getSfxMuted(): boolean {
    return this.isSfxMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  playMatch(): void {
    this.resume();
    if (this.isMuted || this.isSfxMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.16); // G5

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playDrop(): void {
    this.resume();
    if (this.isMuted || this.isSfxMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.15);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playCheer(): void {
    this.resume();
    if (this.isMuted || this.isSfxMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    try {
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(1.2, t);
      filter.frequency.exponentialRampToValueAtTime(1600, t + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.6);
    } catch (e) {
      console.warn('Cheer synthesis failed:', e);
    }
  }

  playWin(): void {
    this.resume();
    if (this.isMuted || this.isSfxMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.06, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.5);
    });
  }

  playLose(): void {
    this.resume();
    if (this.isMuted || this.isSfxMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [220.00, 207.65, 196.00, 174.61]; // A3 -> Ab3 -> G3 -> F3
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.06, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.7);
    });
  }

  private startBackgroundLoop(): void {
    if (isTestMode) return; // Do not start background loop in testMode automatically
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if ((window as any).__rockstar_loop_interval__) {
      clearInterval((window as any).__rockstar_loop_interval__);
    }

    this.bgLoopGain = this.ctx.createGain();
    const vol = (this.isMuted || this.isMusicMuted) ? 0 : 0.015;
    this.bgLoopGain.gain.setValueAtTime(vol, t);
    this.bgLoopGain.connect(this.ctx.destination);

    // Simple bass beat: A2, C3, G2, D3
    const notes = [110.00, 130.81, 98.00, 146.83];
    const playNextNote = () => {
      if (this.isMuted || this.isMusicMuted || !this.ctx) return;
      try {
        const freq = notes[this.currentLoopIndex];
        this.currentLoopIndex = (this.currentLoopIndex + 1) % notes.length;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.75);

        osc.connect(gain);
        gain.connect(this.bgLoopGain!);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.75);
      } catch (err) {
        // Silently catch in case AudioContext state is interrupted
      }
    };

    (window as any).__rockstar_loop_interval__ = setInterval(playNextNote, 800);
  }
}

export const SoundEffects = new SoundEffectsManager();
