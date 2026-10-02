import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ProfileService } from '../../../core/services/profile.service';
import { Dir, DIRECTIONS, GameEvent, QueenGame } from '../game/queen-game';
import { QueenSfx } from '../game/queen-sfx';
import { QueenStats } from '../game/stats';
import { AbilityHud, AbilityId, HudState, RunResult } from '../queen.models';
import { QueenHud } from '../queen-hud/queen-hud';
import { QueenRenderer } from '../render/queen-renderer';

/** Teclas → dirección. Flechas y WASD en cruz; Q, E, Z y C en diagonal (y el teclado numérico). */
const KEYS: Record<string, Dir> = {
  ArrowRight: DIRECTIONS[0], KeyD: DIRECTIONS[0], Numpad6: DIRECTIONS[0],
  KeyC: DIRECTIONS[1], Numpad3: DIRECTIONS[1],
  ArrowDown: DIRECTIONS[2], KeyS: DIRECTIONS[2], Numpad2: DIRECTIONS[2],
  KeyZ: DIRECTIONS[3], Numpad1: DIRECTIONS[3],
  ArrowLeft: DIRECTIONS[4], KeyA: DIRECTIONS[4], Numpad4: DIRECTIONS[4],
  KeyQ: DIRECTIONS[5], Numpad7: DIRECTIONS[5],
  ArrowUp: DIRECTIONS[6], KeyW: DIRECTIONS[6], Numpad8: DIRECTIONS[6],
  KeyE: DIRECTIONS[7], Numpad9: DIRECTIONS[7],
};

const ABILITY_KEYS: Record<string, AbilityId> = {
  Digit1: 'knight', KeyF: 'knight',
  Digit2: 'bishop', KeyG: 'bishop',
  Digit3: 'castle', KeyH: 'castle',
};

/** Con este desplazamiento (px) un toque pasa a ser un deslizamiento en esa dirección. */
const SWIPE_DISTANCE = 28;
const HUD_INTERVAL = 66;
/** Pausa tras el final para ver caer las últimas partículas antes del resumen. */
const END_DELAY = 0.9;
const MAX_DT = 0.05;

@Component({
  selector: 'app-queen-arena',
  imports: [QueenHud],
  templateUrl: './queen-arena.html',
  styleUrl: './queen-arena.scss',
  host: {
    '(window:keydown)': 'onKey($event)',
    '[class.frenzy]': 'hud().frenzyActive',
  },
})
export class QueenArena {
  private readonly profile = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly stats = input.required<QueenStats>();
  readonly finished = output<RunResult>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  readonly hud = signal<HudState>({
    timeLeft: 0, runTime: 1, gold: 0, combo: 0, comboLeft: 0,
    stamina: 0, maxStamina: 1, frenzy: 0, frenzyActive: false, frenzyReady: false,
    goldRush: false, abilities: [],
  });
  readonly paused = signal(false);

  private game?: QueenGame;
  private renderer?: QueenRenderer;
  private readonly sfx = new QueenSfx(() => this.profile.profile().soundOn);
  private frame = 0;
  private last = 0;
  private hudAt = 0;
  private overFor = 0;
  private reported = false;
  private pointerStart: { x: number; y: number } | null = null;
  private readonly calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    afterNextRender(() => this.begin());
    const onVisibility = () => document.hidden && this.paused.set(true);
    document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.frame);
      document.removeEventListener('visibilitychange', onVisibility);
      this.sfx.destroy();
    });
  }

  private begin(): void {
    this.game = new QueenGame(this.stats());
    this.renderer = new QueenRenderer(this.canvas().nativeElement, this.game.size);
    const stage = this.stage().nativeElement;
    // El tubo de neón ocupa 16 px (borde y relleno) alrededor del canvas
    const fit = () => this.renderer?.resize(stage.clientWidth - 16, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    this.destroyRef.onDestroy(() => observer.disconnect());
    this.publishHud();
    this.last = performance.now();
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(now: number): void {
    const game = this.game!;
    const dt = Math.min(MAX_DT, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused()) {
      game.update(dt);
      this.handle(game.events);
      game.events = [];
      if (game.over) this.overFor += dt;
    }
    this.renderer!.draw(game, now / 1000, this.calm);

    if (now - this.hudAt > HUD_INTERVAL) {
      this.hudAt = now;
      this.publishHud();
    }
    if (game.over && this.overFor > END_DELAY && !this.reported) this.report(false);
    if (!this.reported || game.particles.length) this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private handle(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'capture':
          this.sfx.capture(e.combo, e.kind, e.frenzy);
          if (e.crit) this.sfx.crit();
          break;
        case 'jump':
          this.sfx.jump();
          break;
        case 'explode':
          this.sfx.explode(e.big);
          break;
        case 'ray':
          this.sfx.ray();
          break;
        case 'teleport':
          this.sfx.teleport();
          break;
        case 'aura':
          if (e.hits) this.sfx.aura();
          break;
        case 'wall':
          this.sfx.wall();
          break;
        case 'pickup':
          this.sfx.pickup(e.kind === 'chest');
          break;
        case 'milestone':
          this.sfx.milestone(e.combo);
          break;
        case 'jackpot':
          this.sfx.jackpot();
          break;
        case 'wave':
          this.sfx.wave();
          break;
        case 'ability-ready':
          this.sfx.ready();
          break;
        case 'hit':
          this.sfx.hit();
          break;
        case 'move':
          this.sfx.move(e.tired);
          break;
        case 'bump':
          this.sfx.bump();
          break;
        case 'expire':
          this.sfx.expire();
          break;
        case 'frenzy-ready':
          this.sfx.frenzyReady();
          break;
        case 'frenzy':
          this.sfx.frenzy();
          break;
        case 'end':
          this.sfx.end();
          this.publishHud();
          break;
      }
    }
  }

  private publishHud(): void {
    const g = this.game;
    if (!g) return;
    this.hud.set({
      timeLeft: g.timeLeft,
      runTime: g.stats.runTime,
      gold: g.gold,
      combo: g.combo,
      comboLeft: g.combo ? g.comboTimer / g.stats.comboWindow : 0,
      stamina: g.stamina,
      maxStamina: g.stats.maxStamina,
      frenzy: g.frenzyMeter,
      frenzyActive: g.frenzyTime > 0,
      frenzyReady: g.frenzyReady,
      goldRush: g.goldRushTime > 0,
      abilities: this.abilities(g),
    });
  }

  /** Las habilidades desbloqueadas, con lo que les falta para estar listas. */
  private abilities(g: QueenGame): AbilityHud[] {
    const s = g.stats;
    const list: AbilityHud[] = [];
    if (s.knight) {
      const full = g.knightCharges >= s.knightCharges;
      list.push({ id: 'knight', key: '1', charge: full ? 1 : g.knightTimer / s.knightCooldown, charges: g.knightCharges, maxCharges: s.knightCharges });
    }
    if (s.bishop) list.push({ id: 'bishop', key: '2', charge: 1 - g.bishopTimer / s.bishopCooldown, charges: g.bishopTimer ? 0 : 1, maxCharges: 1 });
    if (s.castle) list.push({ id: 'castle', key: '3', charge: 1 - g.castleTimer / s.castleCooldown, charges: g.castleTimer ? 0 : 1, maxCharges: 1 });
    return list;
  }

  private report(abandoned: boolean): void {
    const g = this.game!;
    this.reported = true;
    this.finished.emit({
      gold: g.gold,
      bonus: g.bonus,
      captures: g.captures,
      bestCombo: g.bestCombo,
      crits: g.crits,
      golden: g.goldenCaught,
      walls: g.wallsBroken,
      byKind: { ...g.capturedByKind },
      abandoned,
    });
  }

  // ───────────────────────── Controles ─────────────────────────

  onKey(event: KeyboardEvent): void {
    if (!this.game || this.reported) return;
    if (event.code === 'Escape' || event.code === 'KeyP') {
      this.togglePause();
      event.preventDefault();
      return;
    }
    if (this.paused()) return;
    if (event.code === 'Space') {
      this.frenzy();
      event.preventDefault();
      return;
    }
    const ability = ABILITY_KEYS[event.code];
    if (ability && !event.repeat) {
      event.preventDefault();
      this.ability(ability);
      return;
    }
    const dir = KEYS[event.code];
    if (!dir || event.repeat) return;
    event.preventDefault();
    this.game.move(dir);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.renderer && event.pointerType === 'mouse') this.renderer.hover = this.renderer.cellAt(event.clientX, event.clientY);
  }

  onPointerLeave(): void {
    if (this.renderer) this.renderer.hover = null;
  }

  onPointerDown(event: PointerEvent): void {
    // Clic derecho: salto de caballo hacia esa casilla
    if (event.button === 2) {
      if (this.paused() || !this.game || !this.renderer) return;
      const cell = this.renderer.cellAt(event.clientX, event.clientY);
      if (cell) this.game.knight(cell);
      return;
    }
    this.pointerStart = { x: event.clientX, y: event.clientY };
    // Así el deslizamiento cuenta aunque el dedo acabe fuera del tablero
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  onPointerUp(event: PointerEvent): void {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || !this.game || !this.renderer || this.paused()) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Deslizar el dedo: la reina sale disparada en esa dirección hasta donde llegue
    if (Math.hypot(dx, dy) >= SWIPE_DISTANCE) {
      const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
      this.game.move(DIRECTIONS[(octant + 8) % 8]);
      return;
    }
    const cell = this.renderer.cellAt(event.clientX, event.clientY);
    if (cell) this.game.moveToward(cell);
  }

  frenzy(): void {
    this.game?.activateFrenzy();
  }

  /** Desde el teclado o el botón del marcador: sin casilla, cada habilidad busca su mejor objetivo. */
  ability(id: AbilityId): void {
    if (!this.game || this.paused()) return;
    if (id === 'knight') this.game.knight();
    else if (id === 'bishop') this.game.bishop();
    else this.game.castle();
  }

  togglePause(): void {
    if (this.game?.over) return;
    this.paused.update((p) => !p);
    this.last = performance.now();
  }

  /** Terminar desde la pausa: el oro conseguido se guarda igual. */
  quit(): void {
    if (!this.game || this.reported) return;
    this.paused.set(false);
    this.report(true);
  }
}
