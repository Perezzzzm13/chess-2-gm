import { EnemyKind } from './enemies';

/**
 * Sonidos de recreativa sintetizados con Web Audio: ondas cuadradas cortas.
 * Las capturas suben de tono con el combo, como una escala, para que encadenar se oiga.
 */
/** Voces sonando a la vez como mucho: en una cadena de explosiones el resto se calla. */
const MAX_VOICES = 14;

export class QueenSfx {
  private context?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private voices = 0;

  constructor(private readonly enabled: () => boolean) {}

  capture(combo: number, kind: EnemyKind, frenzy: boolean): void {
    // Escala pentatónica: suena bien la suba por larga que sea la racha
    const steps = [0, 2, 4, 7, 9];
    const n = Math.min(combo - 1, 24);
    const semitone = 12 * Math.floor(n / steps.length) + steps[n % steps.length];
    const base = kind === 'k' ? 523 : kind === 'q' ? 440 : 330;
    const freq = Math.min(base * 2 ** (semitone / 12), 2600);
    this.blip(freq, 0.07, 0.06, frenzy ? 'sawtooth' : 'square');
    this.blip(freq * 1.5, 0.05, 0.035, 'square', 0.04);
    if (kind === 'q' || kind === 'k') this.blip(freq * 2, 0.12, 0.04, 'triangle', 0.08);
  }

  hit(): void {
    this.slide(220, 110, 0.08, 0.06, 'square');
  }

  move(tired: boolean): void {
    this.slide(tired ? 140 : 180, tired ? 90 : 260, 0.05, 0.025, 'triangle');
  }

  bump(): void {
    this.blip(90, 0.06, 0.05, 'square');
  }

  expire(): void {
    this.slide(300, 120, 0.12, 0.02, 'triangle');
  }

  frenzyReady(): void {
    [659, 880].forEach((f, i) => this.blip(f, 0.09, 0.05, 'square', i * 0.07));
  }

  frenzy(): void {
    this.slide(200, 1200, 0.35, 0.06, 'sawtooth');
  }

  end(): void {
    [784, 659, 523, 392].forEach((f, i) => this.blip(f, 0.14, 0.06, 'square', i * 0.11));
  }

  crit(): void {
    this.blip(1568, 0.06, 0.04, 'square', 0.03);
    this.blip(2093, 0.08, 0.035, 'square', 0.07);
  }

  jump(): void {
    this.slide(160, 520, 0.12, 0.05, 'square');
  }

  explode(big: boolean): void {
    this.noise(big ? 0.45 : 0.3, big ? 0.16 : 0.12);
    this.slide(big ? 120 : 160, 40, big ? 0.35 : 0.25, 0.09, 'square');
  }

  ray(): void {
    this.slide(1800, 300, 0.22, 0.05, 'sawtooth');
    this.slide(900, 150, 0.22, 0.03, 'square');
  }

  teleport(): void {
    this.slide(300, 1600, 0.1, 0.05, 'triangle');
  }

  aura(): void {
    this.blip(392, 0.08, 0.04, 'triangle');
    this.blip(587, 0.1, 0.03, 'triangle', 0.04);
  }

  wall(): void {
    this.noise(0.12, 0.08);
  }

  pickup(chest: boolean): void {
    const notes = chest ? [523, 659, 784, 1047, 1319] : [880, 1175];
    notes.forEach((f, i) => this.blip(f, 0.07, 0.045, 'square', i * 0.05));
  }

  /** Fanfarria de recreativa: más larga cuanto más alto el hito. */
  milestone(combo: number): void {
    const notes = [523, 659, 784, 1047, 1319, 1568].slice(0, combo >= 25 ? 6 : combo >= 10 ? 5 : 4);
    notes.forEach((f, i) => this.blip(f, 0.1, 0.05, 'square', i * 0.06));
  }

  jackpot(): void {
    [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => this.blip(f, 0.09, 0.05, 'square', i * 0.07));
  }

  wave(): void {
    [196, 196, 262].forEach((f, i) => this.blip(f, 0.14, 0.06, 'sawtooth', i * 0.12));
  }

  ready(): void {
    this.blip(1319, 0.05, 0.03, 'triangle');
  }

  buy(): void {
    [523, 784].forEach((f, i) => this.blip(f, 0.08, 0.05, 'square', i * 0.06));
  }

  /** Ruido blanco filtrado: explosiones y muros que se rompen. */
  private noise(duration: number, volume: number): void {
    if (!this.enabled()) return;
    try {
      const ctx = this.audio();
      if (this.voices >= MAX_VOICES || ctx.state !== 'running') return;
      // Un único medio segundo de ruido, reutilizado: crear buffers en cada explosión sale caro
      if (!this.noiseBuffer) {
        this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const start = ctx.currentTime;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter).connect(gain).connect(this.master!);
      this.track(source);
      source.start(start, Math.random() * 0.2, duration);
    } catch {
      // Audio no disponible: se juega en silencio
    }
  }

  /** Cuenta la voz mientras suena y la desconecta al acabar, para que el grafo de audio no crezca. */
  private track(node: AudioScheduledSourceNode): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
      node.disconnect();
    };
  }

  private audio(): AudioContext {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') this.context.resume().catch(() => undefined);
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  private blip(freq: number, duration: number, volume: number, type: OscillatorType, delay = 0): void {
    this.voice(type, duration, volume, delay, (osc, start) => osc.frequency.setValueAtTime(freq, start));
  }

  private slide(from: number, to: number, duration: number, volume: number, type: OscillatorType): void {
    this.voice(type, duration, volume, 0, (osc, start) => {
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    });
  }

  private voice(type: OscillatorType, duration: number, volume: number, delay: number, tune: (osc: OscillatorNode, start: number) => void): void {
    if (!this.enabled() || this.voices >= MAX_VOICES) return;
    try {
      const ctx = this.audio();
      // Hasta que el navegador deja sonar (primer gesto), no se programa nada que no vaya a terminar
      if (ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      osc.type = type;
      tune(osc, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(this.master!);
      this.track(osc);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      // Audio no disponible: se juega en silencio
    }
  }

  destroy(): void {
    this.context?.close().catch(() => undefined);
  }
}
