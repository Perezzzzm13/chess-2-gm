import { ENEMIES, EnemyKind, pickEnemy } from './enemies';
import { QueenStats } from './stats';
import { around, wallSegment } from './walls';

export interface Cell {
  x: number;
  y: number;
}

export interface Dir {
  dx: number;
  dy: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  age: number;
  lifetime: number;
  /** Segundos desde el último golpe (para el destello blanco). */
  hurt: number;
  /** De oro macizo: vale mucho más. */
  golden: boolean;
}

export type PickupKind = 'clock' | 'bolt' | 'star' | 'chest';

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  age: number;
  lifetime: number;
}

export interface Bomb {
  x: number;
  y: number;
  fuse: number;
  max: number;
  radius: number;
  /** Suelta bombitas al explotar. */
  cluster: boolean;
  /** Nacida de otra explosión: no encadena más. */
  chained: boolean;
}

/** Un movimiento de la reina: deslizarse en línea o saltar en L. */
export interface Motion {
  kind: 'slide' | 'jump';
  from: Cell;
  to: Cell;
  dir: Dir;
  /** Casillas que atraviesa, en orden y sin la de salida. */
  cells: Cell[];
  /** Cuántas de esas casillas ya ha pisado. */
  reached: number;
  t: number;
  duration: number;
  frenzy: boolean;
  tired: boolean;
  /** Pieza que golpea sin matarla: la reina se queda delante y rebota. */
  hit: Enemy | null;
}

/** Lo que haría un movimiento, sin hacerlo: sirve para jugar y para la vista previa. */
export interface Plan {
  dir: Dir;
  cells: Cell[];
  hit: Enemy | null;
  frenzy: boolean;
}

export type Tone = EnemyKind | 'queen' | 'dust' | 'gold' | 'wall' | 'fire' | 'cyan';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  tone: Tone;
  /** 0 cuerpo, 1 brillo, 2 sombra. */
  shade: number;
  size: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  tone: Tone;
  big: boolean;
}

export interface Ghost {
  x: number;
  y: number;
  life: number;
  frenzy: boolean;
}

/** Efectos de un instante: explosiones, rayos y ondas. Solo se dibujan. */
export interface Blast {
  x: number;
  y: number;
  radius: number;
  life: number;
  max: number;
}

export interface Beam {
  from: Cell;
  to: Cell;
  life: number;
  max: number;
}

export interface Pulse {
  x: number;
  y: number;
  radius: number;
  life: number;
  max: number;
  tone: 'gold' | 'crimson' | 'white' | 'cyan';
}

/** Letrero grande en mitad del tablero: hitos de combo, oleadas, premio gordo… */
export interface Banner {
  text: string;
  sub: string;
  life: number;
  max: number;
  tone: 'gold' | 'crimson' | 'cyan';
}

type Source = 'move' | 'frenzy' | 'jump' | 'kick' | 'bomb' | 'ray' | 'aura' | 'castle' | 'shock';

type Order =
  | { type: 'move'; dir: Dir; distance: number }
  | { type: 'knight'; target: Cell | null }
  | { type: 'bishop' }
  | { type: 'castle' };

export type GameEvent =
  | { type: 'capture'; kind: EnemyKind; gold: number; combo: number; frenzy: boolean; crit: boolean; golden: boolean }
  | { type: 'hit'; kind: EnemyKind }
  | { type: 'move'; tired: boolean; frenzy: boolean }
  | { type: 'jump' }
  | { type: 'bump' }
  | { type: 'expire' }
  | { type: 'frenzy' }
  | { type: 'frenzy-ready' }
  | { type: 'explode'; big: boolean }
  | { type: 'ray' }
  | { type: 'teleport' }
  | { type: 'aura'; hits: number }
  | { type: 'wall' }
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'milestone'; combo: number }
  | { type: 'jackpot' }
  | { type: 'wave' }
  | { type: 'ability-ready' }
  | { type: 'end' };

const GHOST_LIFE = 0.16;
const FRENZY_SPEED = 1.7;
const TIRED_RECOVERY = 0.3;
const JUMP_TIME = 0.26;
/** Si quedan menos piezas que esto, aparecen enseguida: nunca hay que quedarse esperando. */
const REFILL_INTERVAL = 0.22;
const WALL_REGROW = 7;
const PICKUP_LIFE = 7;
const MAX_PARTICLES = 320;
const MAX_FLOATERS = 18;
const MILESTONES = [5, 10, 15, 25, 35, 50, 75, 100, 150, 200, 300];
const MILESTONE_WORDS = ['¡En racha!', '¡Imparable!', '¡Brutal!', '¡Masacre!', '¡Arrasando!', '¡Leyenda!', '¡Divina!', '¡Inhumana!', '¡Absurda!', '¡Fin del mundo!', '¡GM!'];
const KNIGHT_JUMPS: Dir[] = [
  { dx: 1, dy: -2 }, { dx: 2, dy: -1 }, { dx: 2, dy: 1 }, { dx: 1, dy: 2 },
  { dx: -1, dy: 2 }, { dx: -2, dy: 1 }, { dx: -2, dy: -1 }, { dx: -1, dy: -2 },
];

/**
 * La partida de La Reina: estado y reglas, sin nada de dibujo.
 * El bucle llama a update(dt) en cada frame; la entrada llega por move(), moveToward() y las habilidades.
 */
export class QueenGame {
  readonly size: number;
  /** Casilla lógica de la reina. */
  cell: Cell;
  /** Posición dibujada (en casillas, con decimales mientras se mueve). */
  readonly pos = { x: 0, y: 0 };
  /** Altura del salto de caballo, 0–1. */
  lift = 0;
  /** Pequeño empujón hacia la pieza golpeada. */
  readonly lunge = { dx: 0, dy: 0, t: 0 };
  motion: Motion | null = null;
  recover = 0;
  queued: Order | null = null;

  enemies: Enemy[] = [];
  /** Casillas con muro (índice y * tamaño + x) y desde cuándo están en pie (para la animación). */
  readonly walls = new Map<number, number>();
  pickups: Pickup[] = [];
  bombs: Bomb[] = [];

  stamina: number;
  frenzyMeter = 0;
  frenzyTime = 0;
  goldRushTime = 0;
  combo = 0;
  comboTimer = 0;
  bestCombo = 0;
  gold = 0;
  /** Lo que puso la hucha al terminar. */
  bonus = 0;
  captures = 0;
  crits = 0;
  goldenCaught = 0;
  wallsBroken = 0;
  readonly capturedByKind: Record<EnemyKind, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  timeLeft: number;
  elapsed = 0;
  shake = 0;
  /** Destello de toda la pantalla (explosiones, premio gordo). */
  flash = 0;
  over = false;

  // Habilidades
  knightCharges: number;
  knightTimer = 0;
  bishopTimer = 0;
  castleTimer = 0;
  auraTimer = 0;

  particles: Particle[] = [];
  floaters: Floater[] = [];
  ghosts: Ghost[] = [];
  blasts: Blast[] = [];
  beams: Beam[] = [];
  pulses: Pulse[] = [];
  banners: Banner[] = [];
  /** Sucesos del último frame, para sonidos y marcadores. Quien los lee los vacía. */
  events: GameEvent[] = [];

  private spawnTimer = 0;
  private waveTimer = 0;
  private lootTimer = 0;
  private wallTimer = 0;
  private echoTimer = 0;
  private castleChain: Enemy[] = [];
  private castleStep = 0;
  private midasPending = false;
  private overtimeUsed = false;
  private readonly wallTarget: number;
  private nextId = 1;

  constructor(
    readonly stats: QueenStats,
    private readonly rng: () => number = Math.random,
  ) {
    this.size = stats.boardSize;
    this.cell = { x: Math.floor((this.size - 1) / 2), y: Math.floor(this.size / 2) };
    this.pos.x = this.cell.x;
    this.pos.y = this.cell.y;
    this.stamina = stats.maxStamina;
    this.timeLeft = stats.runTime;
    this.knightCharges = stats.knightCharges;

    // Muros, sin encerrar a la reina en su casilla de salida
    const safe = new Set(around(this.cell, 1, this.size).map((c) => this.index(c.x, c.y)));
    for (let i = 0; i < stats.walls; i++) this.raiseWall(safe, 99);
    this.wallTarget = this.walls.size;

    // Que haya algo que cazar desde el primer segundo
    for (let i = 0; i < this.minOnBoard; i++) this.spawn(i < 3 ? 'p' : undefined);
  }

  get frenzyReady(): boolean {
    return this.frenzyMeter >= 100 && this.frenzyTime === 0;
  }

  get tired(): boolean {
    return this.stamina < 1 && this.frenzyTime === 0;
  }

  /** Por debajo de esto, el tablero se rellena casi al instante. */
  get minOnBoard(): number {
    return Math.min(this.stats.maxEnemies, Math.max(3, Math.ceil(this.stats.maxEnemies * 0.6)));
  }

  get damage(): number {
    return this.stats.attack;
  }

  // ───────────────────────── Entrada ─────────────────────────

  /** Mueve en una dirección; sin distancia, todo lo que permita el alcance. */
  move(dir: Dir, distance = Infinity): void {
    this.order({ type: 'move', dir, distance });
  }

  /** Hacia una casilla concreta: si no está en línea, toma la dirección más parecida. */
  moveToward(target: Cell): void {
    const step = this.stepToward(target);
    if (step) this.move(step.dir, step.distance);
  }

  /** Salto de caballo: hacia una casilla, o sin ella al mejor sitio (una pieza, o lo más cerca de una). */
  knight(target: Cell | null = null): void {
    if (this.stats.knight) this.order({ type: 'knight', target });
  }

  bishop(): void {
    if (this.stats.bishop) this.order({ type: 'bishop' });
  }

  castle(): void {
    if (this.stats.castle) this.order({ type: 'castle' });
  }

  activateFrenzy(): void {
    if (this.over || !this.frenzyReady) return;
    this.frenzyTime = this.stats.frenzyDuration;
    this.shake = Math.max(this.shake, 0.5);
    this.events.push({ type: 'frenzy' });
    if (this.stats.frenzyShock > 0) {
      const center = this.motion?.to ?? this.cell;
      this.pulses.push({ x: center.x, y: center.y, radius: this.stats.frenzyShock, life: 0.45, max: 0.45, tone: 'crimson' });
      for (const c of around(center, this.stats.frenzyShock, this.size)) {
        const enemy = this.enemyAt(c.x, c.y);
        if (enemy) this.capture(enemy, 'shock');
      }
    }
  }

  /** Lo que pasaría al ir hacia una casilla (para resaltar el camino bajo el ratón). */
  preview(target: Cell): Plan | null {
    if (this.over) return null;
    const step = this.stepToward(target);
    return step ? this.plan(step.dir, step.distance, this.motion?.to ?? this.cell) : null;
  }

  /** Dónde caería el salto de caballo hacia una casilla (para la vista previa). */
  previewJump(target: Cell | null): Cell | null {
    if (this.over || !this.stats.knight || this.knightCharges < 1) return null;
    return this.jumpLanding(this.motion?.to ?? this.cell, target);
  }

  /** Casillas a las que llega en cada dirección (las marcas tenues del tablero). */
  reach(): Cell[] {
    const origin = this.motion?.to ?? this.cell;
    const cells: Cell[] = [];
    for (const dir of DIRECTIONS) cells.push(...this.plan(dir, Infinity, origin).cells);
    return cells;
  }

  isWall(x: number, y: number): boolean {
    return this.walls.has(this.index(x, y));
  }

  // ───────────────────────── Bucle ─────────────────────────

  update(dt: number): void {
    if (this.over) {
      this.updateEffects(dt);
      return;
    }
    this.elapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.timeUp();

    this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegen * dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.combo = 0;
      }
    }
    if (this.frenzyTime > 0) {
      this.frenzyTime = Math.max(0, this.frenzyTime - dt);
      this.frenzyMeter = (100 * this.frenzyTime) / this.stats.frenzyDuration;
    }
    this.goldRushTime = Math.max(0, this.goldRushTime - dt);

    this.updateAbilities(dt);
    this.updateMotion(dt);
    this.updateBombs(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateSpawner(dt);
    this.updateWalls(dt);
    this.updateEffects(dt);
  }

  private timeUp(): void {
    // Prórroga: si el combo sigue vivo, la partida aguanta un poco más (una vez)
    if (this.stats.overtime > 0 && !this.overtimeUsed && this.combo >= 5) {
      this.overtimeUsed = true;
      this.timeLeft = this.stats.overtime;
      this.banner('¡Prórroga!', `+${this.stats.overtime} s`, 'cyan');
      return;
    }
    this.timeLeft = 0;
    this.over = true;
    this.queued = null;
    this.motion = null;
    this.lift = 0;
    this.pos.x = this.cell.x;
    this.pos.y = this.cell.y;
    if (this.stats.interest > 0 && this.gold > 0) {
      this.bonus = Math.round(this.gold * this.stats.interest);
      this.gold += this.bonus;
      this.banner('Hucha', `+${this.bonus}`, 'gold');
    }
    this.events.push({ type: 'end' });
  }

  private updateAbilities(dt: number): void {
    const s = this.stats;
    if (s.knight && this.knightCharges < s.knightCharges) {
      this.knightTimer += dt;
      if (this.knightTimer >= s.knightCooldown) {
        this.knightTimer = 0;
        this.knightCharges++;
        this.events.push({ type: 'ability-ready' });
      }
    }
    if (this.bishopTimer > 0) {
      this.bishopTimer = Math.max(0, this.bishopTimer - dt);
      if (this.bishopTimer === 0) this.events.push({ type: 'ability-ready' });
    }
    if (this.castleTimer > 0) {
      this.castleTimer = Math.max(0, this.castleTimer - dt);
      if (this.castleTimer === 0) this.events.push({ type: 'ability-ready' });
    }
    if (this.echoTimer > 0) {
      this.echoTimer -= dt;
      if (this.echoTimer <= 0) this.fireRays();
    }
    if (this.castleChain.length) {
      this.castleStep -= dt;
      if (this.castleStep <= 0) this.castleNext();
    }
    if (s.aura) {
      this.auraTimer += dt;
      if (this.auraTimer >= s.auraInterval) {
        this.auraTimer = 0;
        this.auraPulse();
      }
    }
  }

  private updateMotion(dt: number): void {
    const m = this.motion;
    if (m) {
      m.t += dt;
      const p = Math.min(1, m.t / m.duration);
      this.pos.x = m.from.x + (m.to.x - m.from.x) * p;
      this.pos.y = m.from.y + (m.to.y - m.from.y) * p;
      this.lift = m.kind === 'jump' ? Math.sin(Math.PI * p) : 0;
      this.ghosts.push({ x: this.pos.x, y: this.pos.y - this.lift * 0.6, life: GHOST_LIFE, frenzy: m.frenzy });

      // Casilla a casilla: arrasa en frenesí, atraviesa con la lanza y recoge objetos al pasar
      if (m.kind === 'slide') {
        const reached = Math.min(m.cells.length, Math.floor(p * m.cells.length + 1e-6));
        for (; m.reached < reached; m.reached++) this.cross(m.cells[m.reached], m, m.reached === m.cells.length - 1);
      }
      if (p >= 1) this.land(m);
      return;
    }
    if (this.recover > 0) this.recover -= dt;
    const order = this.queued;
    // Las habilidades no esperan a la pausa de después de moverse; los movimientos sí
    if (order && (order.type !== 'move' || this.recover <= 0) && !this.over) {
      this.queued = null;
      this.run(order);
    }
  }

  /** La reina pisa una casilla de su camino. */
  private cross(c: Cell, m: Motion, last: boolean): void {
    const i = this.index(c.x, c.y);
    if (this.walls.has(i)) this.breakWall(c.x, c.y);
    this.collectAt(c.x, c.y);
    const enemy = this.enemyAt(c.x, c.y);
    if (!enemy) return;
    if (m.frenzy) this.capture(enemy, 'frenzy');
    // Con la lanza se lleva por delante lo que cae de un golpe; sin ella, solo la última casilla
    else if ((this.stats.lance || last) && enemy.hp <= this.damage) this.capture(enemy, 'move');
  }

  private land(m: Motion): void {
    this.motion = null;
    this.cell = m.to;
    this.pos.x = m.to.x;
    this.pos.y = m.to.y;
    this.lift = 0;
    this.recover = this.frenzyTime > 0 && this.stats.rampage ? 0 : this.stats.recovery + (m.tired ? TIRED_RECOVERY : 0);

    if (m.kind === 'jump') {
      this.landJump(m.to);
      return;
    }
    // Golpe sin matar: la pieza encaja el daño y la reina rebota
    if (m.hit && this.enemies.includes(m.hit)) {
      const target = m.hit;
      this.lunge.dx = m.dir.dx;
      this.lunge.dy = m.dir.dy;
      this.lunge.t = 1;
      this.strike(target, this.damage * (this.stats.doubleStrike ? 2 : 1), 'move');
    }
  }

  private landJump(at: Cell): void {
    this.shake = Math.max(this.shake, 0.25);
    this.burst(at.x, at.y, 'dust', 10, 0.8);
    this.collectAt(at.x, at.y);
    // El caballo cae a plomo: lo que haya en la casilla, cae
    const prey = this.enemyAt(at.x, at.y);
    if (prey) this.capture(prey, 'jump');
    if (this.stats.knightKick) {
      this.pulses.push({ x: at.x, y: at.y, radius: 1, life: 0.3, max: 0.3, tone: 'cyan' });
      for (const c of around(at, 1, this.size)) {
        const enemy = this.enemyAt(c.x, c.y);
        if (enemy) this.strike(enemy, this.damage * 2, 'kick');
      }
    }
  }

  /** Daña a una pieza; si cae, se captura. */
  private strike(enemy: Enemy, damage: number, source: Source): void {
    enemy.hp -= damage;
    enemy.hurt = 0;
    if (enemy.hp <= 0) {
      this.capture(enemy, source);
    } else {
      this.shake = Math.max(this.shake, 0.18);
      this.burst(enemy.x, enemy.y, enemy.kind, 5, 0.6);
      this.events.push({ type: 'hit', kind: enemy.kind });
    }
  }

  private updateBombs(dt: number): void {
    if (!this.bombs.length) return;
    for (const b of this.bombs) b.fuse -= dt;
    const ready = this.bombs.filter((b) => b.fuse <= 0);
    if (!ready.length) return;
    this.bombs = this.bombs.filter((b) => b.fuse > 0);
    for (const b of ready) this.explode(b);
  }

  private explode(b: Bomb): void {
    const big = b.radius >= 2;
    this.blasts.push({ x: b.x, y: b.y, radius: b.radius, life: 0.4, max: 0.4 });
    this.shake = Math.min(1, this.shake + 0.3 + 0.12 * b.radius);
    this.flash = Math.max(this.flash, big ? 0.35 : 0.2);
    this.burst(b.x, b.y, 'fire', 14 + 8 * b.radius, 1.2 + 0.3 * b.radius);
    this.events.push({ type: 'explode', big });
    for (const c of around(b, b.radius, this.size)) {
      if (this.isWall(c.x, c.y)) this.breakWall(c.x, c.y);
      const enemy = this.enemyAt(c.x, c.y);
      if (enemy) {
        this.capture(enemy, 'bomb');
        // Reacción en cadena: la pieza revienta a su vez
        if (this.stats.chainReaction && !b.chained) this.dropBomb(c, 0.14, 1, false, true);
      }
    }
    if (b.cluster) {
      for (const d of [{ dx: 2, dy: 2 }, { dx: -2, dy: 2 }, { dx: 2, dy: -2 }, { dx: -2, dy: -2 }]) {
        const c = { x: b.x + d.dx, y: b.y + d.dy };
        if (this.inside(c.x, c.y)) this.dropBomb(c, 0.35, 1, false, true);
      }
    }
  }

  private dropBomb(at: Cell, fuse: number, radius: number, cluster: boolean, chained: boolean): void {
    this.bombs.push({ x: at.x, y: at.y, fuse, max: fuse, radius, cluster, chained });
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      e.age += dt;
      e.hurt += dt;
    }
    const expired = this.enemies.filter((e) => e.age >= e.lifetime);
    if (!expired.length) return;
    this.enemies = this.enemies.filter((e) => e.age < e.lifetime);
    for (const e of expired) {
      this.burst(e.x, e.y, 'dust', 6, 0.5);
      this.events.push({ type: 'expire' });
    }
  }

  private updatePickups(dt: number): void {
    for (const p of this.pickups) p.age += dt;
    this.pickups = this.pickups.filter((p) => p.age < p.lifetime);

    const interval = this.stats.lootInterval || (this.stats.chests ? 12 : 0);
    if (!interval) return;
    this.lootTimer += dt;
    if (this.lootTimer < interval) return;
    this.lootTimer = 0;
    const chest = this.stats.chests && (!this.stats.lootInterval || this.rng() < 0.3);
    const kinds: PickupKind[] = ['clock', 'bolt', 'star'];
    this.dropPickup(chest ? 'chest' : kinds[Math.floor(this.rng() * kinds.length)]);
  }

  private updateSpawner(dt: number): void {
    const s = this.stats;
    // Un tablero vacío se rellena en el acto
    if (!this.enemies.length) {
      for (let i = 0; i < this.minOnBoard; i++) this.spawn();
      this.spawnTimer = 0;
    }
    const scarce = this.enemies.length < this.minOnBoard;
    const rampage = s.rampage && this.frenzyTime > 0 ? 0.5 : 1;
    const interval = scarce ? Math.min(REFILL_INTERVAL, s.spawnInterval) : s.spawnInterval * rampage;
    this.spawnTimer += dt;
    while (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      if (this.enemies.length < s.maxEnemies * (rampage < 1 ? 1.5 : 1)) this.spawn();
    }

    if (s.waveInterval > 0) {
      this.waveTimer += dt;
      if (this.waveTimer >= s.waveInterval) {
        this.waveTimer = 0;
        const count = Math.min(4 + s.rank * 2, s.maxEnemies + 8 - this.enemies.length);
        for (let i = 0; i < count; i++) this.spawn();
        this.banner('¡Oleada!', `${count} piezas`, 'crimson');
        this.events.push({ type: 'wave' });
      }
    }
  }

  private updateWalls(dt: number): void {
    for (const [i, age] of this.walls) this.walls.set(i, age + dt);
    if (this.walls.size >= this.wallTarget) return;
    // Los muros caídos vuelven a levantarse en otro sitio
    this.wallTimer += dt;
    if (this.wallTimer < WALL_REGROW) return;
    this.wallTimer = 0;
    const busy = new Set([this.cell, this.motion?.to ?? this.cell].map((c) => this.index(c.x, c.y)));
    for (const e of this.enemies) busy.add(this.index(e.x, e.y));
    for (const p of this.pickups) busy.add(this.index(p.x, p.y));
    for (const c of around(this.cell, 1, this.size)) busy.add(this.index(c.x, c.y));
    this.raiseWall(busy, 0);
  }

  private updateEffects(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 9 * dt;
      p.vx *= 1 - 2.5 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= (f.big ? 1.1 : 0.9) * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    for (const fx of [this.blasts, this.beams, this.pulses, this.banners]) for (const e of fx) e.life -= dt;
    this.blasts = this.blasts.filter((b) => b.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.pulses = this.pulses.filter((p) => p.life > 0);
    this.banners = this.banners.filter((b) => b.life > 0);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.lunge.t = Math.max(0, this.lunge.t - dt * 7);
  }

  // ───────────────────────── Reglas ─────────────────────────

  private order(order: Order): void {
    if (this.over) return;
    const busy = this.motion || (order.type === 'move' && this.recover > 0);
    if (busy) {
      // Se guarda la última orden para encadenar en cuanto se pueda
      this.queued = order;
      return;
    }
    this.run(order);
  }

  private run(order: Order): void {
    switch (order.type) {
      case 'move':
        return this.start(order.dir, order.distance);
      case 'knight':
        return this.jump(order.target);
      case 'bishop':
        return this.rays();
      case 'castle':
        return this.castling();
    }
  }

  private start(dir: Dir, distance: number): void {
    const plan = this.plan(dir, distance, this.cell);
    if (!plan.cells.length && !plan.hit) {
      this.events.push({ type: 'bump' });
      return;
    }
    const tired = this.tired;
    if (!plan.frenzy) this.stamina = Math.max(0, this.stamina - 1);
    const to = plan.cells.at(-1) ?? this.cell;
    const speed = this.stats.slideSpeed * (plan.frenzy ? FRENZY_SPEED : tired ? this.stats.tiredSpeed : 1);
    this.motion = {
      kind: 'slide',
      from: { ...this.cell },
      to,
      dir,
      cells: plan.cells,
      reached: 0,
      t: 0,
      // Golpear a una pieza pegada también lleva un instante
      duration: Math.max(0.06, plan.cells.length / speed),
      frenzy: plan.frenzy,
      tired,
      hit: plan.hit,
    };
    this.events.push({ type: 'move', tired, frenzy: plan.frenzy });
  }

  private plan(dir: Dir, distance: number, origin: Cell): Plan {
    const frenzy = this.frenzyTime > 0;
    const max = frenzy ? Infinity : Math.min(distance, this.stats.range);
    const cells: Cell[] = [];
    let hit: Enemy | null = null;
    for (let k = 1; k <= max; k++) {
      const x = origin.x + dir.dx * k;
      const y = origin.y + dir.dy * k;
      if (!this.inside(x, y)) break;
      // Los muros paran en seco, salvo a la reina demoledora en frenesí
      if (this.isWall(x, y) && !(frenzy && this.stats.frenzyBreaksWalls)) break;
      const enemy = frenzy ? null : this.enemyAt(x, y);
      if (enemy) {
        // Si no la mata de un golpe, se queda en la casilla anterior
        if (enemy.hp > this.damage) {
          hit = enemy;
          break;
        }
        cells.push({ x, y });
        if (!this.stats.lance) break;
        continue;
      }
      cells.push({ x, y });
    }
    return { dir, cells, hit, frenzy };
  }

  private jump(target: Cell | null): void {
    if (this.knightCharges < 1) {
      this.events.push({ type: 'bump' });
      return;
    }
    const to = this.jumpLanding(this.cell, target);
    if (!to) {
      this.events.push({ type: 'bump' });
      return;
    }
    this.knightCharges--;
    if (this.stats.bomb) this.dropBomb(this.cell, this.stats.bombFuse, this.stats.bombRadius, this.stats.cluster, false);
    this.motion = {
      kind: 'jump',
      from: { ...this.cell },
      to,
      dir: { dx: Math.sign(to.x - this.cell.x), dy: Math.sign(to.y - this.cell.y) },
      cells: [],
      reached: 0,
      t: 0,
      duration: JUMP_TIME,
      frenzy: this.frenzyTime > 0,
      tired: false,
      hit: null,
    };
    this.recover = 0;
    this.events.push({ type: 'jump' });
  }

  /** La casilla del salto en L: la más cercana al objetivo, o la más jugosa si no hay objetivo. */
  private jumpLanding(origin: Cell, target: Cell | null): Cell | null {
    const options = KNIGHT_JUMPS.map((d) => ({ x: origin.x + d.dx, y: origin.y + d.dy })).filter(
      (c) => this.inside(c.x, c.y) && !this.isWall(c.x, c.y),
    );
    if (!options.length) return null;
    const score = (c: Cell): number => {
      if (target) return -Math.hypot(c.x - target.x, c.y - target.y);
      const prey = this.enemyAt(c.x, c.y);
      if (prey) return 1000 + this.worth(prey);
      // Sin pieza a tiro: lo más cerca posible de la más valiosa
      const best = Math.min(...this.enemies.map((e) => Math.hypot(e.x - c.x, e.y - c.y) - this.worth(e) * 0.05), 99);
      return -best;
    };
    return options.reduce((a, b) => (score(b) > score(a) ? b : a));
  }

  private rays(): void {
    if (this.bishopTimer > 0) {
      this.events.push({ type: 'bump' });
      return;
    }
    this.bishopTimer = this.stats.bishopCooldown;
    this.fireRays();
    if (this.stats.bishopEcho) this.echoTimer = 0.5;
  }

  private fireRays(): void {
    const origin = this.motion?.to ?? this.cell;
    const dirs = this.stats.bishopCompass ? DIRECTIONS : DIRECTIONS.filter((d) => d.dx && d.dy);
    this.shake = Math.max(this.shake, 0.35);
    this.flash = Math.max(this.flash, 0.15);
    this.events.push({ type: 'ray' });
    for (const dir of dirs) {
      let end = origin;
      for (let k = 1; ; k++) {
        const x = origin.x + dir.dx * k;
        const y = origin.y + dir.dy * k;
        if (!this.inside(x, y)) break;
        if (this.isWall(x, y)) {
          if (!this.stats.bishopPierce) break;
          this.breakWall(x, y);
        }
        end = { x, y };
        const enemy = this.enemyAt(x, y);
        if (enemy) this.capture(enemy, 'ray');
      }
      if (end !== origin) this.beams.push({ from: { ...origin }, to: end, life: 0.45, max: 0.45 });
    }
  }

  private castling(): void {
    if (this.castleTimer > 0 || !this.enemies.length) {
      this.events.push({ type: 'bump' });
      return;
    }
    this.castleTimer = this.stats.castleCooldown;
    this.castleChain = [...this.enemies].sort((a, b) => this.worth(b) - this.worth(a)).slice(0, this.stats.castleTargets);
    this.castleStep = 0;
    this.castleNext();
  }

  /** Un salto del enroque: aparece sobre la pieza y la captura de un golpe. */
  private castleNext(): void {
    const target = this.castleChain.shift();
    this.castleStep = 0.14;
    if (!target || !this.enemies.includes(target) || this.motion) return;
    const from = { ...this.cell };
    const steps = Math.max(Math.abs(target.x - from.x), Math.abs(target.y - from.y));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 1;
      this.ghosts.push({ x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t, life: GHOST_LIFE * 2, frenzy: false });
    }
    this.pulses.push({ x: from.x, y: from.y, radius: 0, life: 0.3, max: 0.3, tone: 'white' });
    this.cell = { x: target.x, y: target.y };
    this.pos.x = target.x;
    this.pos.y = target.y;
    this.pulses.push({ x: target.x, y: target.y, radius: 1, life: 0.35, max: 0.35, tone: 'white' });
    this.events.push({ type: 'teleport' });
    this.capture(target, 'castle');
    this.collectAt(target.x, target.y);
  }

  private auraPulse(): void {
    const center = { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
    const victims = around(center, this.stats.auraRadius, this.size)
      .map((c) => this.enemyAt(c.x, c.y))
      .filter((e): e is Enemy => !!e);
    this.pulses.push({ x: center.x, y: center.y, radius: this.stats.auraRadius, life: 0.4, max: 0.4, tone: 'gold' });
    for (const e of victims) this.strike(e, this.damage, 'aura');
    this.events.push({ type: 'aura', hits: victims.length });
  }

  private capture(enemy: Enemy, source: Source): void {
    if (!this.enemies.includes(enemy)) return;
    const s = this.stats;
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = s.comboWindow;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    const spec = ENEMIES[enemy.kind];
    const frenzy = source === 'frenzy' || this.frenzyTime > 0;
    let multiplier = 1 + s.comboBonus * (this.combo - 1);
    if (frenzy) multiplier *= s.frenzyGold;
    if (source === 'ray') multiplier *= s.bishopGold;
    if (enemy.golden) multiplier *= s.goldenMult;
    if (this.goldRushTime > 0) multiplier *= 2;
    const crit = this.rng() < s.critChance;
    const jackpot = crit && this.rng() < s.jackpotChance;
    if (crit) multiplier *= jackpot ? 10 : s.critMult;
    const gold = Math.max(1, Math.round(spec.value * s.treasure * s.greed * multiplier));

    this.gold += gold;
    this.captures++;
    this.capturedByKind[enemy.kind]++;
    if (crit) this.crits++;
    this.timeLeft += s.timePerCapture;

    if (!frenzy) {
      const wasReady = this.frenzyReady;
      this.frenzyMeter = Math.min(100, this.frenzyMeter + s.frenzyCharge * (1 + 0.04 * this.combo));
      if (!wasReady && this.frenzyReady) this.events.push({ type: 'frenzy-ready' });
    }
    if (enemy.golden) {
      this.goldenCaught++;
      if (s.goldRush > 0) {
        this.goldRushTime = s.goldRush;
        this.banner('¡Fiebre del oro!', `oro x2 · ${s.goldRush} s`, 'gold');
      }
    }

    this.burst(enemy.x, enemy.y, enemy.golden ? 'gold' : enemy.kind, 8 + Math.min(16, spec.value), 1);
    // Monedas: más cuanto más vale la captura
    this.burst(enemy.x, enemy.y, 'gold', Math.min(14, Math.round(2 + Math.log2(gold) * 1.5)), 0.9);
    if (this.floaters.length >= MAX_FLOATERS) this.floaters.shift();
    this.floaters.push({
      x: enemy.x + 0.5,
      y: enemy.y + 0.2,
      text: crit ? `¡${gold}!` : `+${gold}`,
      life: crit ? 1.2 : 0.9,
      max: crit ? 1.2 : 0.9,
      tone: crit || enemy.golden ? 'gold' : enemy.kind,
      big: crit || gold >= 20 || frenzy,
    });
    this.shake = Math.min(1, this.shake + (frenzy ? 0.22 : 0.16) + spec.value * 0.01 + (crit ? 0.15 : 0));
    if (jackpot) {
      this.flash = 0.6;
      this.banner('¡Premio gordo!', `+${gold}`, 'gold');
      this.events.push({ type: 'jackpot' });
    }
    this.events.push({ type: 'capture', kind: enemy.kind, gold, combo: this.combo, frenzy, crit, golden: enemy.golden });

    if (s.midasEvery && this.combo % s.midasEvery === 0) this.midasPending = true;
    this.milestone();
    if (!this.enemies.length) this.cleared();
  }

  /** Los hitos del combo pagan una propina y se anuncian a lo grande. */
  private milestone(): void {
    const i = MILESTONES.indexOf(this.combo);
    if (i < 0) return;
    const bonus = Math.round(this.combo * 2 * this.stats.treasure * this.stats.greed * this.stats.fanfare * (1 + this.stats.rank * 0.5));
    this.gold += bonus;
    this.banner(`x${this.combo} ${MILESTONE_WORDS[i]}`, `+${bonus}`, i >= 3 ? 'crimson' : 'gold');
    this.flash = Math.max(this.flash, 0.25);
    this.events.push({ type: 'milestone', combo: this.combo });
  }

  /** Tablero limpio: propina (si se ha mejorado) y el spawner lo rellena enseguida. */
  private cleared(): void {
    if (this.stats.sweepBonus <= 0) return;
    const bonus = Math.round(this.stats.sweepBonus * this.stats.treasure);
    this.gold += bonus;
    this.banner('¡Tablero limpio!', `+${bonus}`, 'cyan');
  }

  private breakWall(x: number, y: number): void {
    if (!this.walls.delete(this.index(x, y))) return;
    this.wallsBroken++;
    this.burst(x, y, 'wall', 12, 1.1);
    this.shake = Math.max(this.shake, 0.2);
    this.events.push({ type: 'wall' });
    if (this.stats.wallGold > 0) {
      const gold = Math.round(this.stats.wallGold * this.stats.treasure);
      this.gold += gold;
      this.floaters.push({ x: x + 0.5, y: y + 0.2, text: `+${gold}`, life: 0.8, max: 0.8, tone: 'wall', big: false });
    }
  }

  private raiseWall(blocked: Set<number>, age: number): void {
    const taken = new Set([...blocked, ...this.walls.keys()]);
    for (const i of wallSegment(this.size, taken, this.rng)) this.walls.set(i, age);
  }

  private collectAt(x: number, y: number): void {
    const pickup = this.pickups.find((p) => p.x === x && p.y === y);
    if (!pickup) return;
    this.pickups = this.pickups.filter((p) => p !== pickup);
    const s = this.stats;
    let text = '';
    switch (pickup.kind) {
      case 'clock':
        this.timeLeft += 3;
        text = '+3 s';
        break;
      case 'bolt':
        this.stamina = s.maxStamina;
        text = '¡Stamina!';
        break;
      case 'star':
        if (this.frenzyTime > 0) this.frenzyTime = Math.min(s.frenzyDuration, this.frenzyTime + 1.5);
        else {
          const wasReady = this.frenzyReady;
          this.frenzyMeter = Math.min(100, this.frenzyMeter + 35);
          if (!wasReady && this.frenzyReady) this.events.push({ type: 'frenzy-ready' });
        }
        text = '+frenesí';
        break;
      case 'chest': {
        const gold = Math.round((20 + 15 * s.rank) * s.treasure * s.greed);
        this.gold += gold;
        text = `+${gold}`;
        this.burst(x, y, 'gold', 24, 1.3);
        this.shake = Math.max(this.shake, 0.3);
        break;
      }
    }
    this.burst(x, y, pickup.kind === 'clock' || pickup.kind === 'bolt' ? 'cyan' : 'gold', 10, 0.9);
    this.floaters.push({ x: x + 0.5, y: y + 0.2, text, life: 1, max: 1, tone: pickup.kind === 'chest' ? 'gold' : 'cyan', big: pickup.kind === 'chest' });
    this.events.push({ type: 'pickup', kind: pickup.kind });
  }

  private dropPickup(kind: PickupKind): void {
    const busy = this.busyCells();
    let candidates: Cell[] = [];
    if (kind === 'chest') {
      // Los cofres se esconden junto a los muros: para eso está el caballo
      for (const i of this.walls.keys()) {
        const w = { x: i % this.size, y: Math.floor(i / this.size) };
        for (const c of around(w, 1, this.size)) if (!busy.has(this.index(c.x, c.y))) candidates.push(c);
      }
    }
    if (!candidates.length) {
      for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) if (!busy.has(this.index(x, y))) candidates.push({ x, y });
    }
    if (!candidates.length) return;
    const c = candidates[Math.floor(this.rng() * candidates.length)];
    this.pickups.push({ id: this.nextId++, kind, x: c.x, y: c.y, age: 0, lifetime: PICKUP_LIFE * (kind === 'chest' ? 1.4 : 1) });
  }

  private spawn(kind = pickEnemy(this.stats.rank, this.rng)): void {
    const busy = this.busyCells();
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(this.rng() * this.size);
      const y = Math.floor(this.rng() * this.size);
      if (busy.has(this.index(x, y))) continue;
      const spec = ENEMIES[kind];
      // En tableros grandes las piezas aguantan algo más: hay más camino hasta ellas
      const lifetime = spec.lifetime * this.stats.lifetimeMult * (0.9 + this.rng() * 0.2) * Math.sqrt(this.size / 8);
      const golden = this.midasPending || this.rng() < this.stats.goldenChance;
      this.midasPending = false;
      this.enemies.push({ id: this.nextId++, kind, x, y, hp: spec.hp, maxHp: spec.hp, age: 0, lifetime, hurt: 99, golden });
      return;
    }
  }

  private busyCells(): Set<number> {
    const busy = new Set<number>(this.walls.keys());
    for (const e of this.enemies) busy.add(this.index(e.x, e.y));
    for (const p of this.pickups) busy.add(this.index(p.x, p.y));
    busy.add(this.index(this.cell.x, this.cell.y));
    if (this.motion) busy.add(this.index(this.motion.to.x, this.motion.to.y));
    return busy;
  }

  private banner(text: string, sub: string, tone: Banner['tone']): void {
    // Un letrero nuevo empuja al anterior: nunca se amontonan
    this.banners = [{ text, sub, life: 1.4, max: 1.4, tone }];
  }

  private worth(e: Enemy): number {
    return ENEMIES[e.kind].value * (e.golden ? this.stats.goldenMult : 1);
  }

  private burst(x: number, y: number, tone: Tone, count: number, power: number): void {
    // Con cadenas de bombas se juntan cientos: por encima del tope, fuera las más viejas
    const excess = this.particles.length + count - MAX_PARTICLES;
    if (excess > 0) this.particles.splice(0, excess);
    for (let i = 0; i < count; i++) {
      const angle = this.rng() * Math.PI * 2;
      const speed = (1.5 + this.rng() * 3.5) * power;
      const max = 0.35 + this.rng() * 0.35;
      this.particles.push({
        x: x + 0.5,
        y: y + 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2 * power,
        life: max,
        max,
        tone,
        shade: i % 3,
        size: this.rng() < 0.3 ? 2 : 1,
      });
    }
  }

  private stepToward(target: Cell): { dir: Dir; distance: number } | null {
    const origin = this.motion?.to ?? this.cell;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    if (!dx && !dy) return null;
    const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const dir = DIRECTIONS[(octant + 8) % 8];
    return { dir, distance: Math.max(Math.abs(dx), Math.abs(dy)) };
  }

  enemyAt(x: number, y: number): Enemy | undefined {
    return this.enemies.find((e) => e.x === x && e.y === y);
  }

  pickupAt(x: number, y: number): Pickup | undefined {
    return this.pickups.find((p) => p.x === x && p.y === y);
  }

  private index(x: number, y: number): number {
    return y * this.size + x;
  }

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }
}

/** Las 8 direcciones de la dama, en el orden de los octantes de atan2 (empezando por la derecha). */
export const DIRECTIONS: Dir[] = [
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
];
