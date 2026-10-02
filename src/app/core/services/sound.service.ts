import { inject, Injectable } from '@angular/core';
import { ProfileService } from './profile.service';

export type SoundEffect = 'move' | 'capture' | 'check' | 'success' | 'error' | 'end' | 'message';

/** Efectos de sonido sintetizados con Web Audio (sin ficheros de audio). */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly profile = inject(ProfileService);
  private context?: AudioContext;

  play(effect: SoundEffect): void {
    if (!this.profile.profile().soundOn) return;
    try {
      this.context ??= new AudioContext();
      const ctx = this.context;
      switch (effect) {
        case 'move':
          this.knock(ctx, 0, 0.18);
          break;
        case 'capture':
          this.knock(ctx, 0, 0.22);
          this.knock(ctx, 0.07, 0.16);
          break;
        case 'check':
          this.tone(ctx, 880, 0, 0.12, 0.08);
          this.knock(ctx, 0, 0.18);
          break;
        case 'success':
          [523, 659, 784].forEach((f, i) => this.tone(ctx, f, i * 0.09, 0.22, 0.09));
          break;
        case 'error':
          this.tone(ctx, 196, 0, 0.25, 0.1, 'sawtooth');
          break;
        case 'message':
          this.tone(ctx, 988, 0, 0.12, 0.05);
          this.tone(ctx, 1319, 0.08, 0.16, 0.05);
          break;
        case 'end':
          [392, 523, 659, 784].forEach((f, i) => this.tone(ctx, f, i * 0.12, 0.5, 0.08));
          break;
      }
    } catch {
      // Audio no disponible: se ignora
    }
  }

  /** Golpe seco de madera: ruido filtrado con caída rápida. */
  private knock(ctx: AudioContext, delay: number, volume: number): void {
    const duration = 0.08;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = volume * 4;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }

  private tone(ctx: AudioContext, freq: number, delay: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }
}
