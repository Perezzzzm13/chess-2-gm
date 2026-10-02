import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { BRANCHES, canBuy, Levels, nodeState, TREE, TREE_BY_ID } from '../game/tree';
import { enemySpriteUrl } from '../render/sprite-url';
import { formatGold } from './tree-format';
import { BRANCH_LABELS, EDGES, Point, toGrid, toWorld, UNIT, WORLD } from './tree-geometry';
import { TreeMinimap, ViewRect } from './tree-minimap/tree-minimap';
import { TreePanel } from './tree-panel/tree-panel';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;
/** Con este desplazamiento (px) un toque pasa a ser un arrastre y ya no selecciona. */
const DRAG_THRESHOLD = 6;
/** Direcciones de las chispas al comprar: ocho, como la reina. */
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * Math.PI) / 4;
  return { dx: Math.round(Math.cos(angle) * 46), dy: Math.round(Math.sin(angle) * 46) };
});

/**
 * El mapa de mejoras: el árbol entero sobre un plano que se arrastra y se amplía,
 * con la minivista en una esquina y la ficha de la mejora elegida.
 */
@Component({
  selector: 'app-queen-tree',
  imports: [Icon, TreeMinimap, TreePanel],
  templateUrl: './queen-tree.html',
  styleUrl: './queen-tree.scss',
  host: { '(window:keydown)': 'onKey($event)' },
})
export class QueenTree {
  readonly levels = input.required<Levels>();
  readonly gold = input.required<number>();
  /** Mejora elegida: el contenedor la recuerda para volver al mismo sitio. */
  readonly selected = model<string | null>(null);
  readonly buy = output<string>();
  readonly play = output<void>();
  readonly back = output<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  readonly world = WORLD;
  readonly sparks = SPARKS;
  readonly labels = BRANCH_LABELS.map((l) => ({ ...l, at: toWorld(l) }));

  readonly zoom = signal(1);
  readonly tx = signal(0);
  readonly ty = signal(0);
  private readonly viewW = signal(0);
  private readonly viewH = signal(0);
  /** Destello de la última compra; la clave cambia para repetir la animación. */
  readonly flash = signal<{ id: string; key: number } | null>(null);

  readonly transform = computed(() => `translate(${this.tx()}px, ${this.ty()}px) scale(${this.zoom()})`);
  readonly goldText = computed(() => formatGold(this.gold()));

  readonly nodes = computed(() => {
    const levels = this.levels();
    const gold = this.gold();
    return TREE.map((node) => {
      const at = toWorld(node);
      const level = levels[node.id] ?? 0;
      return {
        node,
        x: at.x,
        y: at.y,
        level,
        state: nodeState(node, levels),
        ready: canBuy(node, levels, gold),
        color: BRANCHES[node.branch].color,
        big: !!node.major || node.branch === 'root',
        sprite: node.sprite ? enemySpriteUrl(node.sprite) : null,
      };
    });
  });

  readonly owned = computed(() => this.nodes().filter((n) => n.level > 0).length);
  readonly total = TREE.length;

  readonly edges = computed(() => {
    const levels = this.levels();
    return EDGES.map(({ from, to }) => {
      const a = toWorld(from);
      const b = toWorld(to);
      const fromOwned = (levels[from.id] ?? 0) > 0;
      const toOwned = (levels[to.id] ?? 0) > 0;
      return {
        id: `${from.id}>${to.id}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        kind: fromOwned && toOwned ? 'lit' : fromOwned ? 'open' : 'dark',
        color: BRANCHES[to.branch].color,
      };
    });
  });

  readonly selectedNode = computed(() => {
    const id = this.selected();
    return id ? (TREE_BY_ID[id] ?? null) : null;
  });

  /** Lo que se ve del mapa, en casillas, para dibujarlo en la minivista. */
  readonly viewRect = computed<ViewRect | null>(() => {
    const z = this.zoom();
    if (!this.viewW()) return null;
    const corner = toGrid({ x: -this.tx() / z, y: -this.ty() / z });
    return { x: corner.x, y: corner.y, width: this.viewW() / z / UNIT, height: this.viewH() / z / UNIT };
  });

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; tx: number; ty: number } | null = null;
  private pinch: { distance: number; zoom: number } | null = null;
  /** El último gesto movió el mapa: el clic que lo cierra no debe seleccionar nada. */
  private dragged = false;

  constructor() {
    afterNextRender(() => {
      const el = this.viewport().nativeElement;
      const measure = () => {
        this.viewW.set(el.clientWidth);
        this.viewH.set(el.clientHeight);
      };
      measure();
      // En móvil se empieza algo más lejos para ver las ramas de alrededor
      if (el.clientWidth < 600) this.zoom.set(0.7);
      const focus = this.selectedNode() ?? TREE_BY_ID['crown'];
      this.centerOn(focus);
      const observer = new ResizeObserver(() => {
        measure();
        this.clamp();
      });
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // ───────────────────────── Selección y compra ─────────────────────────

  select(id: string): void {
    if (this.dragged) return;
    this.selected.set(this.selected() === id ? null : id);
  }

  purchase(id: string): void {
    const node = TREE_BY_ID[id];
    if (!node || !canBuy(node, this.levels(), this.gold())) return;
    this.buy.emit(id);
    this.flash.set({ id, key: (this.flash()?.key ?? 0) + 1 });
  }

  // ───────────────────────── Navegación ─────────────────────────

  /** Centra el mapa en un punto del árbol (en casillas). */
  centerOn(p: Point): void {
    const at = toWorld(p);
    const z = this.zoom();
    this.tx.set(this.viewW() / 2 - at.x * z);
    this.ty.set(this.viewH() / 2 - at.y * z);
    this.clamp();
  }

  zoomBy(factor: number, origin?: { x: number; y: number }): void {
    const z = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (next === z) return;
    const ox = origin?.x ?? this.viewW() / 2;
    const oy = origin?.y ?? this.viewH() / 2;
    // El punto bajo el cursor (o el centro) se queda quieto mientras se amplía
    this.tx.set(ox - ((ox - this.tx()) * next) / z);
    this.ty.set(oy - ((oy - this.ty()) * next) / z);
    this.zoom.set(next);
    this.clamp();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    this.zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  onPointerDown(event: PointerEvent): void {
    if ((event.target as Element).closest('app-tree-panel, app-tree-minimap, .zoom')) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 1) {
      this.dragged = false;
      this.dragStart = { x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty() };
    } else if (this.pointers.size === 2) {
      this.pinch = { distance: this.pointerDistance(), zoom: this.zoom() };
      this.dragged = true;
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const rect = this.viewport().nativeElement.getBoundingClientRect();
      const target = (this.pinch.zoom * this.pointerDistance()) / this.pinch.distance;
      this.zoomBy(target / this.zoom(), { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top });
      return;
    }

    const start = this.dragStart;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!this.dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!this.dragged) {
      this.dragged = true;
      // Solo se captura el puntero al arrastrar: así un toque normal sigue siendo un clic en el nodo
      this.viewport().nativeElement.setPointerCapture?.(event.pointerId);
    }
    this.tx.set(start.tx + dx);
    this.ty.set(start.ty + dy);
    this.clamp();
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size === 1) {
      // Al soltar un dedo del pellizco, el otro sigue arrastrando desde donde está
      const [p] = [...this.pointers.values()];
      this.dragStart = { x: p.x, y: p.y, tx: this.tx(), ty: this.ty() };
    } else if (this.pointers.size === 0) {
      this.dragStart = null;
    }
  }

  onKey(event: KeyboardEvent): void {
    if (event.code !== 'Escape') return;
    if (this.selected()) this.selected.set(null);
    else this.back.emit();
  }

  /** Que siempre quede algo del árbol a la vista: el centro de la pantalla no sale del mapa. */
  private clamp(): void {
    const z = this.zoom();
    const w = this.viewW();
    const h = this.viewH();
    this.tx.set(Math.min(w / 2, Math.max(w / 2 - WORLD.width * z, this.tx())));
    this.ty.set(Math.min(h / 2, Math.max(h / 2 - WORLD.height * z, this.ty())));
  }

  private pointerDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }
}
