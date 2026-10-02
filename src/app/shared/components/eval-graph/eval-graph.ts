import { Component, computed, input, output } from '@angular/core';
import { MoveEvaluation } from '../../../core/models/classification.models';
import { whiteWinChance } from '../../../core/chess/chess-utils';
import { CLASSIFICATIONS } from '../../../core/chess/classification';

const WIDTH = 100;
const HEIGHT = 30;
const HIGHLIGHTED = new Set(['brilliant', 'great', 'miss', 'mistake', 'blunder']);

@Component({
  selector: 'app-eval-graph',
  templateUrl: './eval-graph.html',
  styleUrl: './eval-graph.scss',
})
export class EvalGraph {
  readonly evaluations = input.required<(MoveEvaluation | null)[]>();
  readonly current = input(-1);
  readonly select = output<number>();

  readonly width = WIDTH;
  readonly height = HEIGHT;

  private readonly points = computed(() => {
    const evals = this.evaluations();
    const n = Math.max(evals.length, 1);
    const pts = [{ x: 0, y: HEIGHT / 2, ply: -1, ev: null as MoveEvaluation | null }];
    evals.forEach((ev, i) => {
      const win = ev ? whiteWinChance(ev.scoreAfter) : 50;
      pts.push({ x: ((i + 1) / n) * WIDTH, y: HEIGHT - (win / 100) * HEIGHT, ply: i, ev });
    });
    return pts;
  });

  readonly area = computed(() => {
    const pts = this.points();
    const line = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    return `0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`;
  });

  readonly markers = computed(() =>
    this.points()
      .filter((p) => p.ev && HIGHLIGHTED.has(p.ev.classification))
      .map((p) => ({ x: p.x, y: p.y, color: CLASSIFICATIONS[p.ev!.classification].color })),
  );

  readonly cursorX = computed(() => {
    const n = Math.max(this.evaluations().length, 1);
    return ((this.current() + 1) / n) * WIDTH;
  });

  onClick(event: MouseEvent): void {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const n = this.evaluations().length;
    const ply = Math.round(((event.clientX - rect.left) / rect.width) * n) - 1;
    this.select.emit(Math.max(-1, Math.min(n - 1, ply)));
  }
}
