import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Arrow, Color, MoveInput } from '../../../core/models/chess.models';
import { opposite, uciToInput } from '../../../core/chess/chess-utils';
import { ProfileService } from '../../../core/services/profile.service';
import { PuzzlePathService } from '../../../core/services/puzzle-path.service';
import { RewardsService } from '../../../core/services/rewards.service';
import { SoundService } from '../../../core/services/sound.service';
import { PuzzleStop } from '../../../data/puzzle-path';
import { puzzleThemeLabels } from '../../../data/puzzles';
import { Board } from '../../../shared/components/board/board';
import { Icon } from '../../../shared/components/icon/icon';

type PuzzleState = 'intro' | 'playing' | 'wrong' | 'solved' | 'revealed';

const OPPONENT_DELAY = 550;

@Component({
  selector: 'app-puzzle-solver',
  imports: [Board, Icon, RouterLink],
  templateUrl: './puzzle-solver.html',
  styleUrl: './puzzle-solver.scss',
})
export class PuzzleSolver {
  readonly profile = inject(ProfileService);
  readonly path = inject(PuzzlePathService);
  private readonly rewards = inject(RewardsService);
  private readonly sound = inject(SoundService);
  private readonly router = inject(Router);

  /** Id del problema, de la ruta /problemas/:id. */
  readonly id = input<string>();

  readonly stop = signal<PuzzleStop>(this.path.stops[0]);
  readonly fen = signal(this.path.stops[0].puzzle.fen);
  readonly lastMove = signal<[string, string] | null>(null);
  /** Índice de la siguiente jugada de la solución que se espera. */
  readonly step = signal(1);
  readonly state = signal<PuzzleState>('intro');
  readonly failed = signal(false);
  /** Ya estaba resuelto al empezar: se juega como repaso, sin puntos. */
  readonly replay = signal(false);
  readonly hint = signal<string | null>(null);
  readonly arrows = signal<Arrow[]>([]);
  readonly ratingDelta = signal<number | null>(null);

  readonly puzzle = computed(() => this.stop().puzzle);
  readonly chapter = computed(() => this.path.chapters[this.stop().chapter]);
  readonly next = computed(() => this.path.after(this.stop()));
  readonly playerColor = computed<Color>(() => opposite(new Chess(this.puzzle().fen).turn()));
  readonly themes = computed(() => puzzleThemeLabels(this.puzzle()).filter((t) => !['Corto', 'Largo'].includes(t)));
  readonly movesToFind = computed(() => Math.ceil((this.puzzle().moves.length - 1) / 2));
  readonly movable = computed(() => (this.state() === 'playing' || this.state() === 'wrong' ? this.playerColor() : 'none'));

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    // Al pasar de un problema al siguiente la ruta cambia pero el componente se reutiliza
    effect(() => {
      const id = this.id();
      untracked(() => this.open(id));
    });
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  retry(): void {
    this.load(this.stop(), true);
  }

  private open(id: string | undefined): void {
    const stop = this.path.byId(id);
    // Un problema bloqueado (o que no existe) devuelve al mapa
    if (!stop || !this.path.isOpen(stop)) {
      this.router.navigate(['/problemas'], { replaceUrl: true });
      return;
    }
    this.load(stop);
  }

  private load(stop: PuzzleStop, keepFailed = false): void {
    this.clearTimers();
    const puzzle = stop.puzzle;
    this.stop.set(stop);
    this.fen.set(puzzle.fen);
    this.lastMove.set(null);
    this.step.set(1);
    this.state.set('intro');
    if (!keepFailed) {
      this.replay.set(this.path.isSolved(stop));
      // Si ya lo falló otro día, no se le vuelve a quitar valoración
      this.failed.set(this.profile.profile().failedPuzzleIds.includes(puzzle.id));
      this.ratingDelta.set(null);
    }
    this.hint.set(null);
    this.arrows.set([]);
    // La primera jugada es del rival: la animamos para que se entienda la situación
    this.later(() => {
      this.playUci(puzzle.moves[0]);
      this.state.set('playing');
    }, OPPONENT_DELAY);
  }

  onMove(input: MoveInput): void {
    if (this.movable() === 'none') return;
    const puzzle = this.puzzle();
    const expected = puzzle.moves[this.step()];
    const uci = input.from + input.to + (input.promotion ?? '');
    const chess = new Chess(this.fen());
    let isMate = false;
    try {
      chess.move(input);
      isMate = chess.isCheckmate();
    } catch {
      return;
    }

    // Se acepta la jugada esperada o cualquier otra que dé mate
    if (uci === expected || isMate) {
      this.hint.set(null);
      this.arrows.set([]);
      this.playUci(uci);
      const nextStep = this.step() + 1;
      if (nextStep >= puzzle.moves.length || isMate) {
        this.complete();
        return;
      }
      this.state.set('playing');
      this.step.set(nextStep + 1);
      this.later(() => this.playUci(puzzle.moves[nextStep]), OPPONENT_DELAY);
    } else {
      this.sound.play('error');
      this.markFailed();
      this.state.set('wrong');
    }
  }

  showHint(): void {
    const move = this.puzzle().moves[this.step()];
    this.hint.set(move.slice(0, 2));
    this.markFailed();
  }

  reveal(): void {
    const move = this.puzzle().moves[this.step()];
    this.arrows.set([{ from: move.slice(0, 2), to: move.slice(2, 4) }]);
    this.markFailed();
  }

  /** Muestra la solución completa jugada a jugada. */
  solve(): void {
    this.markFailed();
    this.state.set('revealed');
    this.arrows.set([]);
    this.hint.set(null);
    const remaining = this.puzzle().moves.slice(this.step());
    remaining.forEach((uci, i) => this.later(() => this.playUci(uci), (i + 1) * 700));
  }

  private markFailed(): void {
    if (this.failed() || this.replay()) return;
    this.failed.set(true);
    const puzzle = this.puzzle();
    this.ratingDelta.set(this.profile.recordPuzzle(puzzle.id, puzzle.rating, 'failed'));
  }

  private complete(): void {
    this.state.set('solved');
    this.sound.play('success');
    if (this.replay()) return;
    const puzzle = this.puzzle();
    if (this.failed()) {
      this.profile.recordPuzzle(puzzle.id, puzzle.rating, 'solved-after-fail');
    } else {
      this.ratingDelta.set(this.profile.recordPuzzle(puzzle.id, puzzle.rating, 'solved'));
    }
    this.celebrateChapter();
  }

  /** Al superar el último problema de una sala se abre la siguiente. */
  private celebrateChapter(): void {
    const chapter = this.chapter();
    if (this.path.chapterStatus(chapter) !== 'done') return;
    const next = this.path.chapters[chapter.index + 1];
    this.rewards.celebrate(
      next
        ? { kind: 'unlock', title: next.name, detail: `Has superado ${chapter.name}. Te esperan ${next.stops.length} problemas más difíciles.` }
        : { kind: 'rating', title: 'Mapa completado', detail: `Has resuelto los ${this.path.stops.length} problemas del castillo.` },
    );
  }

  private playUci(uci: string): void {
    const chess = new Chess(this.fen());
    const move = chess.move(uciToInput(uci));
    this.fen.set(chess.fen());
    this.lastMove.set([move.from, move.to]);
    this.sound.play(chess.inCheck() ? 'check' : move.captured ? 'capture' : 'move');
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
