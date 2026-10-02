import { Component, computed, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { MoveEvaluation } from '../../../core/models/classification.models';
import { ClassBadge } from '../class-badge/class-badge';

interface MoveCell {
  ply: number;
  san: string;
  evaluation: MoveEvaluation | null;
}

interface MoveRow {
  number: number;
  white: MoveCell | null;
  black: MoveCell | null;
}

@Component({
  selector: 'app-move-list',
  imports: [ClassBadge],
  templateUrl: './move-list.html',
  styleUrl: './move-list.scss',
})
export class MoveList {
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly sans = input.required<string[]>();
  readonly evaluations = input<(MoveEvaluation | null)[]>([]);
  /** Ply seleccionado (índice de la última jugada mostrada, -1 = posición inicial). */
  readonly current = input(-1);
  readonly showBadges = input(true);
  /** Si la partida empezó con negras al turno (p. ej. desde un FEN), la primera fila no tiene jugada blanca. */
  readonly blackStarts = input(false);

  readonly select = output<number>();

  readonly rows = computed<MoveRow[]>(() => {
    const evals = this.evaluations();
    const cells: (MoveCell | null)[] = this.sans().map((san, ply) => ({ ply, san, evaluation: evals[ply] ?? null }));
    if (this.blackStarts()) cells.unshift(null);
    const rows: MoveRow[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push({ number: i / 2 + 1, white: cells[i], black: cells[i + 1] ?? null });
    }
    return rows;
  });

  constructor() {
    // Mantiene visible la jugada actual
    effect(() => {
      const ply = this.current();
      const el = this.scroller()?.nativeElement;
      if (!el) return;
      queueMicrotask(() => {
        const active = el.querySelector<HTMLElement>(`[data-ply="${ply}"]`);
        if (active) active.scrollIntoView({ block: 'nearest' });
        else if (ply === this.sans().length - 1) el.scrollTop = el.scrollHeight;
      });
    });
  }
}
