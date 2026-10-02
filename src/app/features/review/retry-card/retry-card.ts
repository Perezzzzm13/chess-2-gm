import { Component, computed, input, output } from '@angular/core';
import { MoveEvaluation } from '../../../core/models/classification.models';
import { CLASSIFICATIONS } from '../../../core/chess/classification';
import { ClassBadge } from '../../../shared/components/class-badge/class-badge';
import { Icon } from '../../../shared/components/icon/icon';
import { Practice, RetryState } from '../review.models';

/** El jugador intenta corregir uno de sus fallos y el motor le dice si lo ha conseguido. */
@Component({
  selector: 'app-retry-card',
  imports: [ClassBadge, Icon],
  templateUrl: './retry-card.html',
  styleUrl: './retry-card.scss',
})
export class RetryCard {
  readonly state = input.required<RetryState>();
  /** La jugada original que se intenta mejorar. */
  readonly evaluation = input.required<MoveEvaluation>();
  readonly practice = input<Practice | null>(null);

  readonly again = output<void>();
  readonly hint = output<void>();
  readonly reveal = output<void>();
  readonly next = output<void>();
  readonly exit = output<void>();

  readonly attemptInfo = computed(() => {
    const attempt = this.state().attempt;
    return attempt ? CLASSIFICATIONS[attempt.classification] : null;
  });

  readonly isLastOfPractice = computed(() => {
    const p = this.practice();
    return !!p && p.index === p.plies.length - 1;
  });
}
