import { Component, computed, input, output } from '@angular/core';
import { MoveEvaluation } from '../../../core/models/classification.models';
import { CLASSIFICATIONS } from '../../../core/chess/classification';
import { ClassBadge } from '../../../shared/components/class-badge/class-badge';
import { Icon } from '../../../shared/components/icon/icon';
import { ViewMode } from '../review.models';

/** Lo que dice el entrenador de una jugada: nota, por qué y qué había que jugar. */
@Component({
  selector: 'app-coach-card',
  imports: [ClassBadge, Icon],
  templateUrl: './coach-card.html',
  styleUrl: './coach-card.scss',
})
export class CoachCard {
  readonly evaluation = input.required<MoveEvaluation>();
  readonly comment = input.required<string>();
  readonly moverName = input.required<string>();
  readonly isMine = input.required<boolean>();
  readonly mode = input.required<ViewMode>();
  readonly lineStep = input(0);
  /** Línea del motor desde la posición previa, en SAN. */
  readonly bestLine = input<string[]>([]);
  readonly retryable = input(false);

  readonly toggleBest = output<void>();
  readonly showLine = output<number>();
  readonly retry = output<void>();

  readonly info = computed(() => CLASSIFICATIONS[this.evaluation().classification]);

  readonly moveNumber = computed(() => {
    const ev = this.evaluation();
    return `${Math.floor(ev.ply / 2) + 1}${ev.color === 'w' ? '.' : '…'}`;
  });

  /** Solo tiene sentido comparar si había una jugada distinta y mejor. */
  readonly hasAlternative = computed(() => {
    const ev = this.evaluation();
    return ev.uci !== ev.bestMove && ev.classification !== 'book' && !!ev.bestSan;
  });

  /** Probabilidad de ganar de quien mueve, antes (jugando lo mejor) y después de la jugada. */
  readonly odds = computed(() => {
    const ev = this.evaluation();
    const before = Math.round(ev.winBefore);
    const after = Math.round(ev.winAfter);
    return { before, after, delta: after - before };
  });
}
