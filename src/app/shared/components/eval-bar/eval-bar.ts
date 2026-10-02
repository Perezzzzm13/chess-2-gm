import { Component, computed, input } from '@angular/core';
import { Color, Score } from '../../../core/models/chess.models';
import { formatScore, whiteWinChance } from '../../../core/chess/chess-utils';

@Component({
  selector: 'app-eval-bar',
  templateUrl: './eval-bar.html',
  styleUrl: './eval-bar.scss',
})
export class EvalBar {
  readonly score = input<Score | null>(null);
  readonly orientation = input<Color>('w');

  readonly whitePercent = computed(() => {
    const score = this.score();
    return score ? whiteWinChance(score) : 50;
  });

  readonly label = computed(() => {
    const score = this.score();
    return score ? formatScore(score).replace('+', '') : '…';
  });

  readonly whiteAhead = computed(() => this.whitePercent() >= 50);
}
