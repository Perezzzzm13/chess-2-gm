import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Arrow, Color, MoveInput, Score } from '../../core/models/chess.models';
import { MoveEvaluation } from '../../core/models/classification.models';
import { opposite, pvToSan, START_FEN, tryMove } from '../../core/chess/chess-utils';
import { gameAccuracy } from '../../core/chess/classification';
import { buildComment } from '../../core/chess/move-comments';
import { AnalysisService, fensFor } from '../../core/engine/analysis.service';
import { GameHistoryService } from '../../core/services/game-history.service';
import { GameReviewService } from '../../core/services/game-review.service';
import { SoundService } from '../../core/services/sound.service';
import { Board } from '../../shared/components/board/board';
import { EvalBar } from '../../shared/components/eval-bar/eval-bar';
import { EvalGraph } from '../../shared/components/eval-graph/eval-graph';
import { Icon } from '../../shared/components/icon/icon';
import { MoveList } from '../../shared/components/move-list/move-list';
import { CoachCard } from './coach-card/coach-card';
import { RetryCard } from './retry-card/retry-card';
import { ReviewOverview } from './review-overview/review-overview';
import { Practice, RetryState, ViewMode } from './review.models';
import { GOOD_ENOUGH, isKeyMoment, isRetryable } from './review.rules';

const BEST_COLOR = '#5fae2e';
const PLAYED_COLOR = '#d8352a';

@Component({
  selector: 'app-review',
  imports: [RouterLink, Board, EvalBar, EvalGraph, MoveList, Icon, CoachCard, RetryCard, ReviewOverview],
  templateUrl: './review.html',
  styleUrl: './review.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class Review {
  private readonly history = inject(GameHistoryService);
  private readonly reviews = inject(GameReviewService);
  private readonly analysis = inject(AnalysisService);
  private readonly sound = inject(SoundService);

  readonly id = input.required<string>();
  /** Ply inicial opcional (query param), p. ej. desde un momento clave del resumen. */
  readonly ply = input<string>();

  // ───────────────────────── Partida y análisis ─────────────────────────

  readonly game = computed(() => this.history.get(this.id()) ?? null);
  private readonly state = computed(() => {
    const game = this.game();
    return game ? this.reviews.review(game) : null;
  });
  readonly evaluations = computed(() => this.state()?.evaluations() ?? []);
  readonly complete = computed(() => this.state()?.complete() ?? false);
  readonly progress = computed(() => (this.state()?.done() ?? 0) / Math.max(1, this.game()?.moves.length ?? 1));

  readonly fens = computed(() => {
    const game = this.game();
    return game ? fensFor(game.startFen, game.moves) : [START_FEN];
  });
  readonly playerColor = computed<Color>(() => this.game()?.playerColor ?? 'w');

  readonly accuracy = computed(() => {
    const evals = this.evaluations().filter((e): e is MoveEvaluation => !!e);
    const of = (color: Color) => {
      const moves = evals.filter((e) => e.color === color);
      return moves.length ? Math.round(gameAccuracy(moves)) : null;
    };
    return { w: of('w'), b: of('b') };
  });

  /** Jugadas que merece la pena mirar: lo brillante y los fallos. */
  readonly keyMoments = computed(() =>
    this.evaluations()
      .filter((e): e is MoveEvaluation => !!e && isKeyMoment(e, this.playerColor()))
      .map((e) => e.ply),
  );

  /** Mis fallos corregibles, para el modo práctica. */
  readonly myMistakes = computed(() =>
    this.evaluations()
      .filter((e): e is MoveEvaluation => !!e && e.color === this.playerColor() && isRetryable(e))
      .map((e) => e.ply),
  );

  // ───────────────────────── Navegación ─────────────────────────

  readonly current = linkedSignal(() => {
    const requested = Number(this.ply());
    return Number.isInteger(requested) ? requested : -1;
  });
  readonly mode = signal<ViewMode>('game');
  /** Paso de la línea del motor que se está viendo (modo line). */
  readonly lineStep = signal(0);
  readonly flipped = signal(false);

  readonly orientation = computed<Color>(() => (this.flipped() ? opposite(this.playerColor()) : this.playerColor()));
  readonly evaluation = computed(() => this.evaluations()[this.current()] ?? null);
  readonly isMine = computed(() => this.evaluation()?.color === this.playerColor());
  readonly fenBefore = computed(() => this.fens()[Math.max(0, this.current())]);

  readonly momentLabel = computed(() => {
    const index = this.keyMoments().indexOf(this.current());
    return index >= 0 ? `Momento clave ${index + 1} de ${this.keyMoments().length}` : 'Momentos clave';
  });
  readonly previousMoment = computed(() => [...this.keyMoments()].reverse().find((p) => p < this.current()) ?? null);
  readonly nextMoment = computed(() => this.keyMoments().find((p) => p > this.current()) ?? null);

  readonly moverName = computed(() => {
    const game = this.game();
    const ev = this.evaluation();
    if (!game || !ev) return '';
    return ev.color === 'w' ? game.white.name : game.black.name;
  });

  /** En las jugadas del rival el comentario va en tercera persona. */
  readonly comment = computed(() => {
    const ev = this.evaluation();
    return ev ? buildComment(ev, this.fens()[ev.ply], this.isMine() ? 'you' : 'them') : '';
  });

  /** La línea del motor desde la posición previa, en SAN y con número de jugada ("4… Nd7", "5. exd6"…). */
  readonly bestLine = computed(() => {
    const ev = this.evaluation();
    if (!ev) return [];
    return pvToSan(this.fens()[ev.ply], ev.bestPv, 8).map((san, i) => {
      const ply = ev.ply + i;
      const number = Math.floor(ply / 2) + 1;
      if (ply % 2 === 0) return `${number}. ${san}`;
      return i === 0 ? `${number}… ${san}` : san;
    });
  });

  // ───────────────────────── Reintento y práctica ─────────────────────────

  readonly retry = signal<RetryState>({ status: 'idle', tries: 0, hint: false });
  readonly practice = signal<Practice | null>(null);
  /** Posición tras el intento del jugador (null mientras piensa). */
  private readonly retryFen = signal<string | null>(null);
  private readonly retryMove = signal<[string, string] | null>(null);

  // ───────────────────────── Tablero ─────────────────────────

  readonly boardFen = computed(() => {
    const ev = this.evaluation();
    switch (this.mode()) {
      case 'best':
        return this.fenBefore();
      case 'retry':
        return this.retryFen() ?? this.fenBefore();
      case 'line': {
        const line = ev?.bestPv.slice(0, this.lineStep() + 1) ?? [];
        return line.reduce((fen, uci) => tryMove(fen, uci)?.chess.fen() ?? fen, this.fenBefore());
      }
      default:
        return this.fens()[this.current() + 1];
    }
  });

  readonly lastMove = computed<[string, string] | null>(() => {
    const ev = this.evaluation();
    switch (this.mode()) {
      case 'best':
        return null;
      case 'retry':
        return this.retryMove() ?? squares(this.game()?.moves[this.current() - 1]);
      case 'line':
        return squares(ev?.bestPv[this.lineStep()]);
      default:
        return squares(this.game()?.moves[this.current()]);
    }
  });

  readonly badge = computed(() => {
    const last = this.lastMove();
    if (!last) return null;
    if (this.mode() === 'retry') {
      const attempt = this.retryMove() ? this.retry().attempt : undefined;
      return attempt ? { square: last[1], classification: attempt.classification } : null;
    }
    const ev = this.evaluation();
    return this.mode() === 'game' && ev ? { square: last[1], classification: ev.classification } : null;
  });

  readonly arrows = computed<Arrow[]>(() => {
    const ev = this.evaluation();
    if (!ev || this.mode() !== 'best') return [];
    const arrows: Arrow[] = [{ from: ev.bestMove.slice(0, 2), to: ev.bestMove.slice(2, 4), color: BEST_COLOR }];
    if (ev.uci !== ev.bestMove) arrows.push({ from: ev.uci.slice(0, 2), to: ev.uci.slice(2, 4), color: PLAYED_COLOR });
    return arrows;
  });

  readonly movable = computed(() => (this.mode() === 'retry' && !this.retryFen() ? this.playerColor() : 'none'));

  readonly hintSquare = computed(() =>
    this.mode() === 'retry' && this.retry().hint && !this.retryFen() ? (this.evaluation()?.bestMove.slice(0, 2) ?? null) : null,
  );

  readonly score = computed<Score | null>(() => {
    const ev = this.evaluation();
    if (!ev) return this.current() === -1 ? { kind: 'cp', value: 20 } : null;
    if (this.mode() === 'retry') return this.retry().attempt?.scoreAfter ?? ev.scoreBefore;
    return this.mode() === 'game' ? ev.scoreAfter : ev.scoreBefore;
  });

  // ───────────────────────── Acciones ─────────────────────────

  goTo(ply: number): void {
    const last = (this.game()?.moves.length ?? 0) - 1;
    this.current.set(Math.max(-1, Math.min(last, ply)));
    this.mode.set('game');
    this.resetRetry();
  }

  /** Alterna entre la partida y otra vista (mejor jugada, línea…). */
  toggleMode(mode: ViewMode): void {
    this.mode.set(this.mode() === mode ? 'game' : mode);
    this.lineStep.set(0);
  }

  showLineStep(step: number): void {
    this.mode.set('line');
    this.lineStep.set(step);
  }

  startRetry(): void {
    this.resetRetry();
    this.mode.set('retry');
  }

  async onRetryMove(move: MoveInput): Promise<void> {
    const ev = this.evaluation();
    if (!ev) return;
    const fenBefore = this.fenBefore();
    const uci = move.from + move.to + (move.promotion ?? '');
    const result = tryMove(fenBefore, uci);
    if (!result) return;

    this.retryFen.set(result.chess.fen());
    this.retryMove.set([move.from, move.to]);
    this.sound.play(result.move.captured ? 'capture' : 'move');
    const tries = this.retry().tries + 1;

    // Repetir la jugada de la partida no cuenta como intento nuevo
    if (uci === ev.uci) {
      this.retry.set({ ...this.retry(), status: 'wrong', tries, attempt: ev, same: true, comment: undefined });
      this.sound.play('error');
      return;
    }

    this.retry.set({ ...this.retry(), status: 'checking', tries, attempt: undefined, same: false, comment: undefined });
    const previousLoss = ev.ply > 0 ? (this.evaluations()[ev.ply - 1]?.loss ?? 0) : 0;
    const attempt = await this.analysis.evaluateMove(ev.ply, fenBefore, uci, previousLoss);
    if (this.mode() !== 'retry' || this.evaluation() !== ev) return;

    const solved = GOOD_ENOUGH.has(attempt.classification);
    this.retry.set({ ...this.retry(), status: solved ? 'right' : 'wrong', attempt, comment: buildComment(attempt, fenBefore) });
    this.sound.play(solved ? 'success' : 'error');
    if (solved) this.practice.update((p) => (p ? { ...p, solved: p.solved + 1 } : p));
  }

  /** Vuelve a la posición previa para otro intento. */
  tryAgain(): void {
    this.retryFen.set(null);
    this.retryMove.set(null);
    this.retry.update((r) => ({ ...r, status: 'idle', attempt: undefined, comment: undefined, same: false }));
  }

  showHint(): void {
    this.tryAgain();
    this.retry.update((r) => ({ ...r, hint: true }));
  }

  revealSolution(): void {
    this.resetRetry();
    this.mode.set('best');
  }

  startPractice(): void {
    const plies = this.myMistakes();
    if (!plies.length) return;
    this.practice.set({ plies, index: 0, solved: 0 });
    this.current.set(plies[0]);
    this.startRetry();
  }

  nextPractice(): void {
    const p = this.practice();
    if (!p) return;
    const index = p.index + 1;
    this.practice.set({ ...p, index });
    if (index < p.plies.length) {
      this.current.set(p.plies[index]);
      this.startRetry();
    } else {
      this.mode.set('game');
      this.resetRetry();
    }
  }

  exitPractice(): void {
    this.practice.set(null);
    this.mode.set('game');
    this.resetRetry();
  }

  onKey(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || this.mode() === 'retry') return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => this.goTo(this.current() - 1),
      ArrowRight: () => this.goTo(this.current() + 1),
      Home: () => this.goTo(-1),
      End: () => this.goTo(Infinity),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  private resetRetry(): void {
    this.retryFen.set(null);
    this.retryMove.set(null);
    this.retry.set({ status: 'idle', tries: 0, hint: false });
  }
}

function squares(uci: string | undefined): [string, string] | null {
  return uci ? [uci.slice(0, 2), uci.slice(2, 4)] : null;
}
