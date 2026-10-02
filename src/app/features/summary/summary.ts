import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Color } from '../../core/models/chess.models';
import { Classification, MoveEvaluation } from '../../core/models/classification.models';
import { CLASSIFICATION_ORDER, CLASSIFICATIONS, gameAccuracy } from '../../core/chess/classification';
import { buildComment } from '../../core/chess/move-comments';
import { fensFor } from '../../core/engine/analysis.service';
import { GameHistoryService } from '../../core/services/game-history.service';
import { GameReviewService } from '../../core/services/game-review.service';
import { ClassBadge } from '../../shared/components/class-badge/class-badge';
import { EvalGraph } from '../../shared/components/eval-graph/eval-graph';
import { Icon } from '../../shared/components/icon/icon';
import { Portrait } from '../../shared/components/portrait/portrait';

const RING_RADIUS = 52;

@Component({
  selector: 'app-summary',
  imports: [RouterLink, ClassBadge, EvalGraph, Icon, Portrait],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  private readonly router = inject(Router);
  private readonly history = inject(GameHistoryService);
  private readonly reviews = inject(GameReviewService);

  readonly id = input.required<string>();

  readonly game = computed(() => this.history.get(this.id()) ?? null);
  private readonly state = computed(() => {
    const game = this.game();
    return game ? this.reviews.review(game) : null;
  });

  readonly evaluations = computed(() => this.state()?.evaluations() ?? []);
  readonly complete = computed(() => this.state()?.complete() ?? false);
  readonly progress = computed(() => {
    const total = this.game()?.moves.length || 1;
    return (this.state()?.done() ?? 0) / total;
  });

  readonly ringCircumference = 2 * Math.PI * RING_RADIUS;
  readonly ringRadius = RING_RADIUS;

  readonly players = computed(() => {
    const game = this.game();
    if (!game) return [];
    return (['w', 'b'] as Color[]).map((color) => {
      const evals = this.evaluations().filter((e): e is MoveEvaluation => !!e && e.color === color);
      const accuracy = gameAccuracy(evals);
      return {
        color,
        info: color === 'w' ? game.white : game.black,
        isMe: color === game.playerColor,
        accuracy,
        dash: (accuracy / 100) * this.ringCircumference,
      };
    });
  });

  readonly rows = computed(() => {
    const evals = this.evaluations().filter((e): e is MoveEvaluation => !!e);
    return CLASSIFICATION_ORDER.map((c: Classification) => ({
      classification: c,
      info: CLASSIFICATIONS[c],
      white: evals.filter((e) => e.color === 'w' && e.classification === c).length,
      black: evals.filter((e) => e.color === 'b' && e.classification === c).length,
    }));
  });

  readonly outcome = computed(() => {
    const game = this.game();
    if (!game) return null;
    if (game.result === '1/2-1/2') return { title: 'Tablas', tone: 'draw' };
    const won = (game.result === '1-0') === (game.playerColor === 'w');
    return won ? { title: 'Victoria', tone: 'win' } : { title: 'Derrota', tone: 'loss' };
  });

  /** Los momentos clave: las jugadas propias con mayor pérdida y las mejores jugadas destacadas. */
  readonly keyMoments = computed(() => {
    const game = this.game();
    if (!game) return [];
    const mine = this.evaluations().filter((e): e is MoveEvaluation => !!e && e.color === game.playerColor);
    const highlights = mine.filter((e) => e.classification === 'brilliant' || e.classification === 'great');
    const errors = mine
      .filter((e) => ['blunder', 'mistake', 'miss'].includes(e.classification))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 3);
    return [...highlights.slice(0, 2), ...errors].sort((a, b) => a.ply - b.ply);
  });

  readonly fullMoves = computed(() => Math.ceil((this.game()?.moves.length ?? 0) / 2));

  private readonly fens = computed(() => {
    const game = this.game();
    return game ? fensFor(game.startFen, game.moves) : [];
  });

  commentFor(ev: MoveEvaluation): string {
    const mine = ev.color === this.game()?.playerColor;
    return buildComment(ev, this.fens()[ev.ply], mine ? 'you' : 'them');
  }

  moveLabel(ev: MoveEvaluation): string {
    const number = Math.floor(ev.ply / 2) + 1;
    return `${number}${ev.color === 'w' ? '.' : '…'} ${ev.san}`;
  }

  openReview(ply: number): void {
    this.router.navigate(['/partidas', this.id(), 'revision'], { queryParams: { ply } });
  }
}
