import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Chess } from 'chess.js';
import { FAMOUS_GAMES } from '../../../data/famous-games';
import { Board } from '../../../shared/components/board/board';

const MOVE_EVERY = 1400;
/** Pausa sobre el mate final antes de pasar a la siguiente partida. */
const FINAL_PAUSE = 5000;

interface Frame {
  fen: string;
  lastMove: [string, string] | null;
  /** Jugada en notación numerada, p. ej. "17. Rd8#". */
  label: string;
}

/** Escaparate de la portada: reproduce en bucle partidas célebres. */
@Component({
  selector: 'app-showcase',
  imports: [Board],
  templateUrl: './showcase.html',
  styleUrl: './showcase.scss',
})
export class Showcase {
  readonly gameIndex = signal(Math.floor(Math.random() * FAMOUS_GAMES.length));
  readonly ply = signal(0);

  readonly game = computed(() => FAMOUS_GAMES[this.gameIndex()]);
  /** Todas las posiciones de la partida, calculadas una vez por partida. */
  private readonly frames = computed<Frame[]>(() => {
    const chess = new Chess();
    const frames: Frame[] = [{ fen: chess.fen(), lastMove: null, label: '' }];
    this.game().sans.forEach((san, i) => {
      const move = chess.move(san);
      const number = Math.floor(i / 2) + 1;
      frames.push({ fen: chess.fen(), lastMove: [move.from, move.to], label: i % 2 === 0 ? `${number}. ${san}` : `${number}… ${san}` });
    });
    return frames;
  });
  readonly frame = computed(() => this.frames()[this.ply()]);
  readonly finished = computed(() => this.ply() === this.frames().length - 1);

  constructor() {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      // Con la pestaña oculta no avanzamos: así al volver se sigue viendo la partida
      if (!document.hidden) this.advance();
      timer = setTimeout(tick, this.finished() ? FINAL_PAUSE : MOVE_EVERY);
    };
    timer = setTimeout(tick, MOVE_EVERY);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  private advance(): void {
    if (this.finished()) {
      this.gameIndex.update((i) => (i + 1) % FAMOUS_GAMES.length);
      this.ply.set(0);
    } else {
      this.ply.update((p) => p + 1);
    }
  }
}
