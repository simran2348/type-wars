import * as Phaser from 'phaser';

const MUTE_KEY = 'type-wars:muted';

type Tone = {
  from: number;
  to?: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  delay?: number;
};

const readMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Tiny synthesized sound effects on Phaser's Web Audio context, so there are
 * no audio files. Silently does nothing when Web Audio is unavailable.
 */
export class Sfx {
  private readonly context: AudioContext | null;
  muted = readMuted();

  constructor(sound: Phaser.Sound.BaseSoundManager) {
    this.context =
      sound instanceof Phaser.Sound.WebAudioSoundManager ? sound.context : null;
  }

  /** Returns the new muted state. */
  toggleMuted(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Storage may be blocked; the toggle still applies to this session.
    }
    return this.muted;
  }

  shoot(): void {
    this.tone({
      from: 1400,
      to: 700,
      duration: 0.05,
      type: 'square',
      volume: 0.025,
    });
  }

  error(): void {
    this.tone({
      from: 160,
      to: 120,
      duration: 0.09,
      type: 'sawtooth',
      volume: 0.04,
    });
  }

  explode(): void {
    this.noise(0.32, 0.12);
    this.tone({ from: 180, to: 45, duration: 0.3, type: 'sine', volume: 0.12 });
  }

  lifeLost(): void {
    this.noise(0.45, 0.15);
    this.tone({
      from: 320,
      to: 70,
      duration: 0.45,
      type: 'sawtooth',
      volume: 0.06,
    });
  }

  gameOver(): void {
    [440, 330, 220].forEach((from, i) =>
      this.tone({
        from,
        to: from * 0.95,
        duration: 0.22,
        type: 'triangle',
        volume: 0.08,
        delay: i * 0.2,
      })
    );
  }

  private tone({
    from,
    to = from,
    duration,
    type,
    volume,
    delay = 0,
  }: Tone): void {
    const ctx = this.playable();
    if (!ctx) {
      return;
    }
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private noise(duration: number, volume: number): void {
    const ctx = this.playable();
    if (!ctx) {
      return;
    }
    const buffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * duration),
      ctx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  private playable(): AudioContext | null {
    return this.muted || !this.context || this.context.state !== 'running'
      ? null
      : this.context;
  }
}
