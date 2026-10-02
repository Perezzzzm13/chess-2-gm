import { Component, computed, input, output } from '@angular/core';
import { Color } from '../../../core/models/chess.models';
import { MoveEvaluation } from '../../../core/models/classification.models';
import { SavedGame } from '../../../core/models/game.models';
import { CLASSIFICATION_ORDER, CLASSIFICATIONS } from '../../../core/chess/classification';
import { ClassBadge } from '../../../shared/components/class-badge/class-badge';
import { Icon } from '../../../shared/components/icon/icon';
import { Portrait } from '../../../shared/components/portrait/portrait';

/** Portada de la revisión: precisión, tus jugadas por tipo (que sirve de leyenda) y momentos clave. */
@Component({
  selector: 'app-review-overview',
  imports: [ClassBadge, Icon, Portrait],
  templateUrl: './review-overview.html',
  styleUrl: './review-overview.scss',
})
export class ReviewOverview {
  readonly game = input.required<SavedGame>();
  readonly evaluations = input.required<(MoveEvaluation | null)[]>();
  readonly accuracy = input.required<Record<Color, number | null>>();
  readonly complete = input(false);
  readonly progress = input(0);
  readonly keyMoments = input<number[]>([]);
  readonly mistakes = input(0);

  readonly start = output<void>();
  readonly practice = output<void>();
  readonly goTo = output<number>();

  readonly players = computed(() => {
    const game = this.game();
    return (['w', 'b'] as Color[]).map((color) => ({
      color,
      info: color === 'w' ? game.white : game.black,
      isMe: color === game.playerColor,
      accuracy: this.accuracy()[color],
    }));
  });

  /** Cuántas jugadas de cada tipo hizo el jugador; las que no hizo se ven apagadas. */
  readonly counts = computed(() => {
    const color = this.game().playerColor;
    const mine = this.evaluations().filter((e): e is MoveEvaluation => !!e && e.color === color);
    return CLASSIFICATION_ORDER.map((c) => ({
      classification: c,
      info: CLASSIFICATIONS[c],
      count: mine.filter((e) => e.classification === c).length,
    }));
  });

  readonly moments = computed(() =>
    this.keyMoments().map((ply) => {
      const ev = this.evaluations()[ply]!;
      return { ply, ev, label: `${Math.floor(ply / 2) + 1}${ev.color === 'w' ? '.' : '…'} ${ev.san}` };
    }),
  );
}
