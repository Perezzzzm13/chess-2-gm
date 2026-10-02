import { Component, computed, input, output } from '@angular/core';
import { BRANCHES, canBuy, Levels, nodeState, TREE } from '../../game/tree';
import { BOUNDS, BRANCH_LABELS, EDGES, Point } from '../tree-geometry';

/** Rectángulo visible del mapa grande, en casillas. */
export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * La minivista: el árbol entero en miniatura, un punto por mejora.
 * En el mapa marca lo que se ve y deja saltar a otra zona; en el cartel es solo un adelanto.
 */
@Component({
  selector: 'app-tree-minimap',
  templateUrl: './tree-minimap.html',
  styleUrl: './tree-minimap.scss',
  host: {
    '[class.interactive]': 'interactive()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'dragging = false',
    '(pointercancel)': 'dragging = false',
  },
})
export class TreeMinimap {
  readonly levels = input.required<Levels>();
  readonly gold = input(0);
  readonly view = input<ViewRect | null>(null);
  readonly selected = input<string | null>(null);
  readonly interactive = input(false);
  /** Punto del árbol (en casillas) al que centrar el mapa. */
  readonly jump = output<Point>();

  readonly box = `${BOUNDS.minX} ${BOUNDS.minY} ${BOUNDS.maxX - BOUNDS.minX} ${BOUNDS.maxY - BOUNDS.minY}`;
  readonly labels = BRANCH_LABELS;

  readonly dots = computed(() => {
    const levels = this.levels();
    const gold = this.gold();
    return TREE.map((node) => {
      const state = nodeState(node, levels);
      const size = node.major || node.branch === 'root' ? 0.56 : 0.4;
      return {
        id: node.id,
        x: node.x - size / 2,
        y: node.y - size / 2,
        size,
        state,
        color: BRANCHES[node.branch].color,
        ready: canBuy(node, levels, gold),
      };
    });
  });

  readonly edges = computed(() => {
    const levels = this.levels();
    return EDGES.map(({ from, to }) => ({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      lit: (levels[from.id] ?? 0) > 0 && (levels[to.id] ?? 0) > 0,
      color: BRANCHES[to.branch].color,
    }));
  });

  dragging = false;

  onPointerDown(event: PointerEvent): void {
    if (!this.interactive()) return;
    this.dragging = true;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.emitAt(event);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.dragging) this.emitAt(event);
  }

  private emitAt(event: PointerEvent): void {
    const svg = (event.currentTarget as Element).querySelector('svg');
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    this.jump.emit({ x: p.x, y: p.y });
  }
}
