import { Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Chess } from 'chess.js';
import { Arrow, Color, MoveInput, PieceType } from '../../../core/models/chess.models';
import { Classification } from '../../../core/models/classification.models';
import { CLASSIFICATIONS } from '../../../core/chess/classification';
import { FILES } from '../../../core/chess/chess-utils';
import { ProfileService } from '../../../core/services/profile.service';
import { Icon } from '../icon/icon';

interface SquareView {
  name: string;
  light: boolean;
  piece: string | null;
  pieceColor: Color | null;
  row: number;
  col: number;
  rankLabel: string | null;
  fileLabel: string | null;
  lastMove: boolean;
  check: boolean;
  target: boolean;
  capture: boolean;
  /** Desplazamiento de origen (en casillas) para animar la pieza recién movida. */
  animate: { dx: number; dy: number } | null;
}

interface ArrowView {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

interface DragState {
  from: string;
  piece: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

export type Movable = Color | 'both' | 'none';

@Component({
  selector: 'app-board',
  imports: [Icon],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: { '[class]': '"board-theme-" + activeTheme()' },
})
export class Board {
  private readonly profile = inject(ProfileService);
  private readonly gridEl = viewChild.required<ElementRef<HTMLElement>>('grid');

  readonly fen = input.required<string>();
  readonly orientation = input<Color>('w');
  readonly movable = input<Movable>('none');
  readonly lastMove = input<[string, string] | null>(null);
  readonly arrows = input<Arrow[]>([]);
  readonly badge = input<{ square: string; classification: Classification } | null>(null);
  readonly hintSquare = input<string | null>(null);
  readonly theme = input<string | null>(null);
  readonly coordinates = input(true);

  readonly move = output<MoveInput>();

  readonly selected = signal<string | null>(null);
  readonly drag = signal<DragState | null>(null);
  readonly promotion = signal<{ from: string; to: string; color: Color } | null>(null);
  /** Jugada soltada con arrastre: no se anima porque la pieza ya está en su sitio. */
  private readonly droppedMove = signal<string | null>(null);

  readonly activeTheme = computed(() => this.theme() ?? this.profile.theme());
  private readonly chess = computed(() => new Chess(this.fen()));

  private readonly legalTargets = computed(() => {
    const from = this.selected();
    if (!from) return new Map<string, boolean>();
    const moves = this.chess().moves({ square: from as never, verbose: true });
    return new Map(moves.map((m) => [m.to as string, !!m.captured]));
  });

  readonly squares = computed<SquareView[]>(() => {
    const chess = this.chess();
    const white = this.orientation() === 'w';
    const last = this.lastMove();
    const targets = this.legalTargets();
    const animateLast = last && this.droppedMove() !== last.join('');
    const inCheck = chess.inCheck();
    const turn = chess.turn();
    const views: SquareView[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const fileIndex = white ? col : 7 - col;
        const rank = white ? 8 - row : row + 1;
        const name = FILES[fileIndex] + rank;
        const piece = chess.get(name as never);
        let animate: SquareView['animate'] = null;
        if (animateLast && last[1] === name) {
          const from = this.displayPosition(last[0]);
          animate = { dx: from.col - col, dy: from.row - row };
        }
        views.push({
          name,
          light: (fileIndex + rank) % 2 === 1,
          piece: piece ? piece.color + piece.type.toUpperCase() : null,
          pieceColor: piece?.color ?? null,
          row,
          col,
          rankLabel: col === 0 ? String(rank) : null,
          fileLabel: row === 7 ? FILES[fileIndex] : null,
          lastMove: !!last && (last[0] === name || last[1] === name),
          check: inCheck && piece?.type === 'k' && piece.color === turn,
          target: targets.has(name),
          capture: targets.get(name) === true,
          animate,
        });
      }
    }
    return views;
  });

  readonly arrowViews = computed<ArrowView[]>(() =>
    this.arrows().map((a) => {
      const from = this.displayPosition(a.from);
      const to = this.displayPosition(a.to);
      const x1 = from.col * 12.5 + 6.25;
      const y1 = from.row * 12.5 + 6.25;
      const tx = to.col * 12.5 + 6.25;
      const ty = to.row * 12.5 + 6.25;
      // Acortamos la flecha para que la punta no tape la pieza de destino
      const len = Math.hypot(tx - x1, ty - y1) || 1;
      const shorten = 3.2;
      return {
        x1,
        y1,
        x2: tx - ((tx - x1) / len) * shorten,
        y2: ty - ((ty - y1) / len) * shorten,
        color: a.color ?? '#7fb648',
      };
    }),
  );

  readonly badgeView = computed(() => {
    const badge = this.badge();
    if (!badge) return null;
    const pos = this.displayPosition(badge.square);
    const info = CLASSIFICATIONS[badge.classification];
    return { left: (pos.col + 1) * 12.5, top: pos.row * 12.5, ...info };
  });

  readonly hintView = computed(() => {
    const sq = this.hintSquare();
    return sq ? this.displayPosition(sq) : null;
  });

  readonly promotionPieces = computed(() => {
    const promo = this.promotion();
    if (!promo) return [];
    const pos = this.displayPosition(promo.to);
    const down = pos.row === 0;
    return (['q', 'n', 'r', 'b'] as PieceType[]).map((type, i) => ({
      type,
      piece: promo.color + type.toUpperCase(),
      col: pos.col,
      row: down ? i : 7 - i,
    }));
  });

  /** Cada tema de tablero tiene su propio juego de piezas (generado con `npm run pieces`). */
  pieceUrl(piece: string): string {
    return `pieces/${this.activeTheme()}/${piece}.webp`;
  }

  onPointerDown(event: PointerEvent): void {
    if (this.promotion()) return;
    const square = this.squareAt(event.clientX, event.clientY);
    if (!square) return;
    const selected = this.selected();

    if (selected && this.legalTargets().has(square)) {
      this.tryMove(selected, square, false);
      return;
    }

    const piece = this.chess().get(square as never);
    if (piece && this.canMove(piece.color)) {
      this.selected.set(square);
      this.drag.set({
        from: square,
        piece: piece.color + piece.type.toUpperCase(),
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
      });
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      event.preventDefault();
    } else {
      this.selected.set(null);
    }
  }

  onPointerMove(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag) return;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
    this.drag.set({ ...drag, x: event.clientX, y: event.clientY, active: drag.active || moved });
  }

  onPointerUp(event: PointerEvent): void {
    const drag = this.drag();
    this.drag.set(null);
    if (!drag?.active) return;
    const square = this.squareAt(event.clientX, event.clientY);
    if (square && square !== drag.from && this.legalTargets().has(square)) {
      this.tryMove(drag.from, square, true);
    }
  }

  ghostStyle(drag: DragState): Record<string, string> {
    const rect = this.gridEl().nativeElement.getBoundingClientRect();
    const size = rect.width / 8;
    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `${drag.x - rect.left - size / 2}px`,
      top: `${drag.y - rect.top - size / 2}px`,
    };
  }

  choosePromotion(type: PieceType): void {
    const promo = this.promotion();
    if (!promo) return;
    this.promotion.set(null);
    this.emitMove({ from: promo.from, to: promo.to, promotion: type });
  }

  cancelPromotion(): void {
    this.promotion.set(null);
  }

  private tryMove(from: string, to: string, dropped: boolean): void {
    const piece = this.chess().get(from as never);
    this.selected.set(null);
    if (!piece) return;
    const lastRank = to[1] === '8' || to[1] === '1';
    if (piece.type === 'p' && lastRank) {
      this.promotion.set({ from, to, color: piece.color });
      return;
    }
    this.droppedMove.set(dropped ? from + to : null);
    this.emitMove({ from, to });
  }

  private emitMove(move: MoveInput): void {
    this.move.emit(move);
  }

  private canMove(color: Color): boolean {
    const movable = this.movable();
    if (movable === 'none') return false;
    const turn = this.chess().turn();
    return color === turn && (movable === 'both' || movable === color);
  }

  private squareAt(x: number, y: number): string | null {
    const rect = this.gridEl().nativeElement.getBoundingClientRect();
    const col = Math.floor(((x - rect.left) / rect.width) * 8);
    const row = Math.floor(((y - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const white = this.orientation() === 'w';
    const file = FILES[white ? col : 7 - col];
    const rank = white ? 8 - row : row + 1;
    return file + rank;
  }

  private displayPosition(square: string): { col: number; row: number } {
    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]);
    const white = this.orientation() === 'w';
    return { col: white ? file : 7 - file, row: white ? 8 - rank : rank - 1 };
  }
}
