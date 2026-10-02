import { Cell, Plan, QueenGame, Tone } from '../game/queen-game';
import { FX_PALETTES, FX_SPRITES, GOLDEN_PALETTE } from './fx-sprites';
import {
  ENEMY_PALETTES,
  FRENZY_PALETTE,
  OUTLINE,
  QUEEN_PALETTE,
  SPRITE_SIZE,
  SPRITES,
  SpritePalette,
  TIRED_PALETTE,
} from './sprites';

/** Píxeles lógicos por casilla: todo se dibuja en esta rejilla y se amplía un número entero de veces. */
const CELL = SPRITE_SIZE;
const GOLD = '#ffd25a';
const CRIMSON = '#ff3b5c';
const WHITE: SpritePalette = { b: '#ffffff', h: '#ffffff', s: '#ffffff', g: '#ffffff' };
const CYAN = '#62f2ff';
const DUST: SpritePalette = { b: '#6a5a6e', h: '#9a8aa0', s: '#3e3242', g: '#9a8aa0' };
const TONES: Partial<Record<Tone, SpritePalette>> = {
  dust: DUST,
  queen: QUEEN_PALETTE,
  gold: { b: '#ffd25a', h: '#fff6c8', s: '#c07c18', g: '#f5e03a' },
  wall: { b: '#4a2438', h: '#ff59c7', s: '#24101c', g: '#7a3a5c' },
  fire: { b: '#ff8a2a', h: '#fff2a8', s: '#d8304d', g: '#ffd25a' },
  cyan: { b: '#62f2ff', h: '#ffffff', s: '#1a8fb0', g: '#c2f4ff' },
};
const MAGENTA = '#ff59c7';
const BANNER_COLORS = { gold: GOLD, crimson: CRIMSON, cyan: CYAN };
/** Textos distintos que se guardan ya pintados; los más viejos se descartan. */
const TEXT_CACHE = 300;

interface TextImage {
  canvas: HTMLCanvasElement;
  /** Tamaño en píxeles lógicos del tablero. */
  w: number;
  h: number;
}
const PULSE_COLORS = { gold: GOLD, crimson: CRIMSON, white: '#ffffff', cyan: CYAN };

/**
 * Dibuja la partida en un único canvas: tablero de neón, piezas de píxel, estela, partículas y números.
 * No guarda estado de juego; solo cachés de imágenes y la casilla bajo el puntero.
 *
 * Rendimiento: nada de shadowBlur ni strokeText por frame. Los resplandores, el tablero y los textos
 * se pintan una vez en su propio canvas y luego solo se copian (drawImage), que es casi gratis.
 */
export class QueenRenderer {
  /** Casilla bajo el puntero, para la vista previa del movimiento. */
  hover: Cell | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private board?: HTMLCanvasElement;
  private readonly texts = new Map<string, TextImage>();
  private readonly halos = new Map<string, HTMLCanvasElement>();
  private scale = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly size: number,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  /**
   * Ajusta el canvas al ancho disponible. Prefiere una ampliación entera (píxeles idénticos);
   * si eso desperdicia mucho sitio (pantallas estrechas), usa la escala exacta del dispositivo.
   */
  resize(cssWidth: number, dpr: number): void {
    const logical = this.size * CELL;
    const available = Math.max(logical, Math.floor(cssWidth * dpr));
    const integer = Math.floor(available / logical) * logical;
    const device = integer >= available * 0.86 ? integer : available;
    this.scale = device / logical;
    if (this.canvas.width !== device) {
      this.canvas.width = device;
      this.canvas.height = device;
      // El tablero y los textos se pintan a la resolución real: con otra escala hay que repetirlos
      this.board = undefined;
      this.texts.clear();
    }
    this.canvas.style.width = `${device / dpr}px`;
    this.canvas.style.height = `${device / dpr}px`;
  }

  cellAt(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * this.size);
    const y = Math.floor(((clientY - rect.top) / rect.height) * this.size);
    return x >= 0 && y >= 0 && x < this.size && y < this.size ? { x, y } : null;
  }

  draw(game: QueenGame, time: number, calm: boolean): void {
    const ctx = this.ctx;
    const s = this.scale;
    const shake = calm ? 0 : game.shake * 3;
    const ox = Math.round((Math.random() - 0.5) * 2 * shake);
    const oy = Math.round((Math.random() - 0.5) * 2 * shake);
    if (ox || oy) {
      // Con la sacudida asoma el borde: se rellena para no dejar restos del frame anterior
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.setTransform(s, 0, 0, s, ox * s, oy * s);
    ctx.imageSmoothingEnabled = false;

    const side = this.size * CELL;
    ctx.drawImage(this.boardImage(), 0, 0, side, side);
    if (game.frenzyTime > 0) {
      ctx.fillStyle = `rgba(255, 40, 80, ${0.1 + 0.06 * Math.sin(time * 14)})`;
      ctx.fillRect(0, 0, side, side);
    } else if (game.goldRushTime > 0) {
      ctx.fillStyle = `rgba(255, 210, 90, ${0.08 + 0.05 * Math.sin(time * 10)})`;
      ctx.fillRect(0, 0, side, side);
    }

    this.drawDanger(game, time);
    this.drawWalls(game);
    if (!game.over) this.drawReach(game);
    this.drawPickups(game, time);
    this.drawEnemies(game, time);
    this.drawBombs(game, time);
    this.drawBeams(game);
    this.drawGhosts(game);
    this.drawQueen(game, time);
    this.drawPulses(game);
    this.drawBlasts(game);
    this.drawParticles(game);
    this.drawFloaters(game);
    this.drawBanners(game);
    if (game.flash > 0 && !calm) {
      ctx.fillStyle = `rgba(255, 246, 220, ${Math.min(0.45, game.flash * 0.7)})`;
      ctx.fillRect(0, 0, side, side);
    }
  }

  // ───────────────────────── Capas ─────────────────────────

  private drawReach(game: QueenGame): void {
    const ctx = this.ctx;
    const frenzy = game.frenzyTime > 0;
    ctx.fillStyle = frenzy ? 'rgba(255, 90, 116, 0.6)' : 'rgba(255, 210, 90, 0.45)';
    for (const c of game.reach()) {
      if (game.enemyAt(c.x, c.y) || game.pickupAt(c.x, c.y)) continue;
      ctx.fillRect(c.x * CELL + 7, c.y * CELL + 7, 2, 2);
    }

    if (!this.hover) return;
    // Dónde caería el salto de caballo (clic derecho)
    const jump = game.previewJump(this.hover);
    if (jump) this.corners(jump, CYAN);

    const plan: Plan | null = game.preview(this.hover);
    if (!plan) return;
    ctx.fillStyle = frenzy ? CRIMSON : GOLD;
    plan.cells.forEach((c, i) => {
      const last = i === plan.cells.length - 1;
      if (last) this.brackets(c, frenzy ? CRIMSON : GOLD);
      else ctx.fillRect(c.x * CELL + 6, c.y * CELL + 6, 4, 4);
    });
    if (plan.hit) this.brackets(plan.hit, CRIMSON);
  }

  private drawEnemies(game: QueenGame, time: number): void {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      const left = e.lifetime - e.age;
      // Parpadea antes de irse, cada vez más rápido
      if (left < 1.5 && Math.floor(time * (left < 0.6 ? 20 : 9)) % 2 === 0) continue;

      const x = e.x * CELL;
      const y = e.y * CELL;
      if (e.age < 0.3) {
        // Columna de luz al aparecer
        ctx.fillStyle = ENEMY_PALETTES[e.kind].b;
        ctx.globalAlpha = 0.5 * (1 - e.age / 0.3);
        ctx.fillRect(x + 5, y - CELL * 2, 6, CELL * 2 + 12);
        ctx.globalAlpha = 1;
      }
      // Cada pieza brilla con su color, como un letrero pequeño
      const glowColor = e.golden ? GOLDEN_PALETTE.b : ENEMY_PALETTES[e.kind].b;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.halo(glowColor), x - 8, y - 8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(x + 3, y + 14, 10, 2);

      const hurt = e.hurt < 0.09;
      const palette = hurt ? WHITE : e.golden ? GOLDEN_PALETTE : ENEMY_PALETTES[e.kind];
      const sprite = this.sprite(e.kind, SPRITES[e.kind], palette, hurt ? 'white' : e.golden ? 'golden' : 'enemy');
      if (e.age < 0.22) {
        const p = e.age / 0.22;
        const k = p < 0.7 ? 0.4 + (p / 0.7) * 0.8 : 1.2 - ((p - 0.7) / 0.3) * 0.2;
        const w = Math.round(CELL * k);
        ctx.drawImage(sprite, x + Math.round((CELL - w) / 2), y + CELL - w, w, w);
      } else {
        ctx.drawImage(sprite, x, y);
      }
      if (e.golden) this.twinkle(x, y, time + e.id);

      // Barra de vida solo si no cae de un golpe: avisa de que hará falta insistir
      if (e.hp > game.stats.attack) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + 2, y - 1, 12, 3);
        ctx.fillStyle = CRIMSON;
        ctx.fillRect(x + 3, y, Math.max(1, Math.round((10 * e.hp) / e.maxHp)), 1);
      }
    }
  }

  private drawGhosts(game: QueenGame): void {
    const ctx = this.ctx;
    for (const g of game.ghosts) {
      ctx.globalAlpha = (g.life / 0.16) * (g.frenzy ? 0.55 : 0.3);
      ctx.drawImage(this.sprite('q', SPRITES.q, g.frenzy ? FRENZY_PALETTE : QUEEN_PALETTE, g.frenzy ? 'frenzy' : 'queen'), Math.round(g.x * CELL), Math.round(g.y * CELL));
    }
    ctx.globalAlpha = 1;
  }

  private drawQueen(game: QueenGame, time: number): void {
    const ctx = this.ctx;
    const frenzy = game.frenzyTime > 0;
    const lunge = game.lunge.t * 3;
    const x = Math.round(game.pos.x * CELL + game.lunge.dx * lunge);
    const ground = Math.round(game.pos.y * CELL + game.lunge.dy * lunge);
    // En el salto de caballo sube y baja; la sombra se queda en el suelo
    const y = ground - Math.round(game.lift * 10);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = game.tired ? 0.3 : 0.8 + 0.2 * Math.sin(time * 6);
    ctx.drawImage(this.halo(frenzy ? CRIMSON : GOLD, 48), x - 16, y - 16);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x + 3 + Math.round(game.lift * 2), ground + 14, 10 - Math.round(game.lift * 4), 2);
    const palette = frenzy ? FRENZY_PALETTE : game.tired ? TIRED_PALETTE : QUEEN_PALETTE;
    const bob = game.motion || game.over ? 0 : Math.round(Math.sin(time * 4) * 0.6);
    ctx.drawImage(this.sprite('q', SPRITES.q, palette, frenzy ? 'frenzy' : game.tired ? 'tired' : 'queen'), x, y + bob);
  }

  private drawParticles(game: QueenGame): void {
    const ctx = this.ctx;
    // Suma de luz: las chispas que se cruzan se encienden más, como en un neón
    ctx.globalCompositeOperation = 'lighter';
    for (const p of game.particles) {
      const palette = this.paletteFor(p.tone);
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      ctx.fillStyle = p.shade === 0 ? palette.b : p.shade === 1 ? palette.h : palette.g;
      ctx.fillRect(Math.round(p.x * CELL), Math.round(p.y * CELL), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawFloaters(game: QueenGame): void {
    const ctx = this.ctx;
    const side = this.size * CELL;
    for (const f of game.floaters) {
      const age = f.max - f.life;
      const pop = age < 0.1 ? 0.6 + (age / 0.1) * 0.5 : age < 0.18 ? 1.1 - ((age - 0.1) / 0.08) * 0.1 : 1;
      const color = f.big ? GOLD : this.paletteFor(f.tone).h;
      const image = this.text(f.text, f.big ? 15 : 11, color, f.big ? GOLD : this.paletteFor(f.tone).b);
      const w = image.w * pop;
      const h = image.h * pop;
      // Que los números de los bordes no se corten: se empujan hacia dentro del tablero
      const x = Math.min(side - w / 2, Math.max(w / 2, f.x * CELL));
      const y = Math.max(h / 2, f.y * CELL);
      ctx.globalAlpha = Math.min(1, f.life / 0.3);
      this.blit(image.canvas, x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  /** Casillas que va a barrer una bomba: parpadean en rojo cuando queda poca mecha. */
  private drawDanger(game: QueenGame, time: number): void {
    const ctx = this.ctx;
    for (const b of game.bombs) {
      if (b.fuse > b.max * 0.6) continue;
      ctx.fillStyle = Math.floor(time * 12) % 2 ? 'rgba(255, 59, 92, 0.22)' : 'rgba(255, 138, 42, 0.12)';
      const r = b.radius;
      ctx.fillRect((b.x - r) * CELL, (b.y - r) * CELL, (2 * r + 1) * CELL, (2 * r + 1) * CELL);
    }
  }

  /** Muros: bloques de noche con el contorno de un tubo de neón rosa por los lados que dan fuera. */
  private drawWalls(game: QueenGame): void {
    const ctx = this.ctx;
    const n = this.size;
    for (const [i, age] of game.walls) {
      const x = (i % n) * CELL;
      const y = Math.floor(i / n) * CELL;
      const rise = Math.min(1, age / 0.3);
      const top = y + Math.round(CELL * (1 - rise));
      ctx.fillStyle = '#1c0a17';
      ctx.fillRect(x, top, CELL, y + CELL - top);
      // Llagas de ladrillo apenas marcadas
      ctx.fillStyle = '#2a1022';
      for (let row = 0; row < 4; row++) {
        const by = y + 2 + row * 4;
        if (by < top) continue;
        const offset = row % 2 ? 4 : 0;
        for (let bx = offset - 8; bx < CELL; bx += 8) ctx.fillRect(x + Math.max(0, bx + 1), by, Math.min(7, CELL - bx - 1), 2);
      }
    }
    // El tubo: primero el resplandor ancho y suave, luego el núcleo fino y brillante
    ctx.globalCompositeOperation = 'lighter';
    for (const [width, color] of [[3, 'rgba(255, 89, 199, 0.28)'], [1, MAGENTA]] as const) {
      ctx.fillStyle = color;
      for (const [i, age] of game.walls) {
        if (age < 0.3) continue;
        const cx = i % n;
        const cy = Math.floor(i / n);
        const x = cx * CELL;
        const y = cy * CELL;
        const open = (dx: number, dy: number) => !game.isWall(cx + dx, cy + dy);
        const o = width === 3 ? -1 : 0;
        if (open(0, -1)) ctx.fillRect(x, y + o, CELL, width);
        if (open(0, 1)) ctx.fillRect(x, y + CELL - width - o, CELL, width);
        if (open(-1, 0)) ctx.fillRect(x + o, y, width, CELL);
        if (open(1, 0)) ctx.fillRect(x + CELL - width - o, y, width, CELL);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawPickups(game: QueenGame, time: number): void {
    const ctx = this.ctx;
    for (const p of game.pickups) {
      const left = p.lifetime - p.age;
      if (left < 1.5 && Math.floor(time * (left < 0.6 ? 20 : 9)) % 2 === 0) continue;
      const x = p.x * CELL;
      const y = p.y * CELL + Math.round(Math.sin(time * 5 + p.id) * 1.2) - 1;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 6 + p.id);
      ctx.drawImage(this.halo(FX_PALETTES[p.kind].h === '#ffffff' ? FX_PALETTES[p.kind].b : FX_PALETTES[p.kind].h), x - 8, y - 8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(x + 4, p.y * CELL + 14, 8, 2);
      ctx.drawImage(this.sprite(p.kind, FX_SPRITES[p.kind], FX_PALETTES[p.kind], 'fx'), x, y);
      if (p.kind === 'chest') this.twinkle(x, y, time + p.id);
    }
  }

  private drawBombs(game: QueenGame, time: number): void {
    const ctx = this.ctx;
    for (const b of game.bombs) {
      const x = b.x * CELL;
      const y = b.y * CELL;
      // La bomba se hincha y destella más deprisa según se acaba la mecha
      const urgency = 1 - b.fuse / b.max;
      const blink = Math.floor(time * (6 + urgency * 22)) % 2 === 0;
      const sprite = this.sprite('bomb', FX_SPRITES.bomb, blink && urgency > 0.4 ? { ...FX_PALETTES.bomb, b: '#d8304d', h: '#ff8a9e' } : FX_PALETTES.bomb, blink && urgency > 0.4 ? 'hot' : 'fx');
      const grow = Math.round(urgency * 3);
      ctx.drawImage(sprite, x - grow / 2, y - grow, CELL + grow, CELL + grow);
      ctx.fillStyle = blink ? '#ffffff' : GOLD;
      ctx.fillRect(x + 10, y - grow, 1, 1);
    }
  }

  private drawBeams(game: QueenGame): void {
    const ctx = this.ctx;
    ctx.lineCap = 'square';
    for (const b of game.beams) {
      const k = b.life / b.max;
      const x1 = b.from.x * CELL + CELL / 2;
      const y1 = b.from.y * CELL + CELL / 2;
      const x2 = b.to.x * CELL + CELL / 2;
      const y2 = b.to.y * CELL + CELL / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      // Tres pasadas: halo ancho, tubo rosa y núcleo blanco
      for (const [width, color, alpha] of [[10, MAGENTA, 0.25], [4, MAGENTA, 0.8], [1.5, '#ffffff', 1]] as const) {
        ctx.globalAlpha = alpha * k;
        ctx.strokeStyle = color;
        ctx.lineWidth = width * (0.5 + k * 0.5);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Ondas cuadradas (aura, coz, onda del frenesí, enroque): un marco que se abre y se apaga. */
  private drawPulses(game: QueenGame): void {
    const ctx = this.ctx;
    for (const p of game.pulses) {
      const k = 1 - p.life / p.max;
      const reach = (p.radius + 0.5) * k * CELL;
      const cx = p.x * CELL + CELL / 2;
      const cy = p.y * CELL + CELL / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = PULSE_COLORS[p.tone];
      for (const [width, alpha] of [[5, 0.25], [1.5, 1]]) {
        ctx.globalAlpha = alpha * (1 - k);
        ctx.lineWidth = width;
        ctx.strokeRect(Math.round(cx - reach), Math.round(cy - reach), Math.round(reach * 2), Math.round(reach * 2));
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawBlasts(game: QueenGame): void {
    const ctx = this.ctx;
    for (const b of game.blasts) {
      const k = 1 - b.life / b.max;
      const r = b.radius;
      // Un fogonazo que llena el área y un anillo que la desborda
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, 0.45 - k * 0.8);
      ctx.fillStyle = k < 0.15 ? '#fff2a8' : k < 0.35 ? '#ff8a2a' : CRIMSON;
      ctx.fillRect((b.x - r) * CELL, (b.y - r) * CELL, (2 * r + 1) * CELL, (2 * r + 1) * CELL);
      const reach = (r + 0.5 + k * 0.8) * CELL;
      const cx = b.x * CELL + CELL / 2;
      const cy = b.y * CELL + CELL / 2;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = CRIMSON;
      ctx.lineWidth = 3;
      ctx.strokeRect(Math.round(cx - reach), Math.round(cy - reach), Math.round(reach * 2), Math.round(reach * 2));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Letrero grande en el centro: un neón que entra de golpe, se queda y se desvanece. */
  private drawBanners(game: QueenGame): void {
    const ctx = this.ctx;
    const side = this.size * CELL;
    const unit = side / 128;
    for (const b of game.banners) {
      const age = b.max - b.life;
      const pop = age < 0.12 ? 1.6 - (age / 0.12) * 0.6 : 1;
      // Parpadeo de tubo al encenderse
      if (age > 0.12 && age < 0.22 && Math.floor(age * 60) % 2) continue;
      ctx.globalAlpha = Math.min(1, b.life / 0.35);
      const y = side * 0.42 - Math.max(0, 0.35 - b.life) * 20 * unit;
      const title = this.text(b.text, Math.round(19 * unit), '#fff6e8', BANNER_COLORS[b.tone]);
      const w = title.w * pop;
      const h = title.h * pop;
      this.blit(title.canvas, side / 2 - w / 2, y - h / 2, w, h);
      if (b.sub) {
        const sub = this.text(b.sub, Math.round(12 * unit), '#fff6c8', GOLD);
        this.blit(sub.canvas, side / 2 - sub.w / 2, y + 15 * unit - sub.h / 2, sub.w, sub.h);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Copia una imagen pintada a resolución real (los textos): con suavizado, que no es un sprite. */
  private blit(image: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(image, x, y, w, h);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Destello en cruz de cuatro píxeles que va saltando por las esquinas del sprite. */
  private twinkle(x: number, y: number, time: number): void {
    const ctx = this.ctx;
    const spots = [[2, 3], [13, 5], [11, 1], [3, 11]];
    const [sx, sy] = spots[Math.floor(time * 4) % spots.length];
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + sx, y + sy - 1, 1, 3);
    ctx.fillRect(x + sx - 1, y + sy, 3, 1);
  }

  /** Cuatro puntos en las esquinas: la marca del salto de caballo. */
  private corners(c: Cell, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    for (const [bx, by] of [[1, 1], [13, 1], [1, 13], [13, 13]]) ctx.fillRect(c.x * CELL + bx, c.y * CELL + by, 2, 2);
  }

  private brackets(c: Cell, color: string): void {
    const ctx = this.ctx;
    const x = c.x * CELL;
    const y = c.y * CELL;
    ctx.fillStyle = color;
    for (const [bx, by, w, h] of [
      [0, 0, 4, 1], [0, 0, 1, 4],
      [12, 0, 4, 1], [15, 0, 1, 4],
      [0, 15, 4, 1], [0, 12, 1, 4],
      [12, 15, 4, 1], [15, 12, 1, 4],
    ]) {
      ctx.fillRect(x + bx, y + by, w, h);
    }
  }

  // ───────────────────────── Cachés ─────────────────────────

  private paletteFor(tone: Tone): SpritePalette {
    return TONES[tone] ?? ENEMY_PALETTES[tone as keyof typeof ENEMY_PALETTES];
  }

  private sprite(name: string, rows: string[], palette: SpritePalette, variant: string): HTMLCanvasElement {
    const key = `${name}|${variant}`;
    let canvas = this.sprites.get(key);
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d')!;
    const colors: Record<string, string> = { o: OUTLINE, ...palette };
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const color = colors[ch];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
    this.sprites.set(key, canvas);
    return canvas;
  }

  /**
   * Tablero de neón a la resolución real: casillas de tinta y una rejilla carmesí encendida.
   * El resplandor (shadowBlur) se calcula una sola vez aquí, nunca en cada frame.
   */
  private boardImage(): HTMLCanvasElement {
    if (this.board) return this.board;
    const k = this.scale;
    const cell = CELL * k;
    const side = this.size * cell;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.round(side);
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1a0c1f' : '#0c050d';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    // Un charco de luz en el centro, como si el letrero iluminara el suelo
    const pool = ctx.createRadialGradient(side / 2, side / 2, 0, side / 2, side / 2, side * 0.7);
    pool.addColorStop(0, 'rgba(255, 59, 92, 0.1)');
    pool.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, side, side);

    ctx.strokeStyle = 'rgba(255, 59, 92, 0.55)';
    ctx.lineWidth = Math.max(1, k * 0.5);
    ctx.shadowColor = 'rgba(255, 40, 80, 0.9)';
    ctx.shadowBlur = 5 * k;
    ctx.beginPath();
    for (let i = 1; i < this.size; i++) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, side);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(side, i * cell);
    }
    ctx.stroke();
    // Las cruces de la rejilla, un punto más claro
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 190, 200, 0.7)';
    const dot = Math.max(1, k);
    for (let y = 1; y < this.size; y++) for (let x = 1; x < this.size; x++) ctx.fillRect(x * cell - dot / 2, y * cell - dot / 2, dot, dot);
    this.board = canvas;
    return canvas;
  }

  /** Texto de neón ya pintado (resplandor, contorno y núcleo) a la resolución real. */
  private text(value: string, px: number, core: string, glow: string): TextImage {
    const key = `${value}|${px}|${core}|${glow}`;
    const cached = this.texts.get(key);
    if (cached) return cached;
    const k = this.scale;
    const font = `${Math.round(px * k)}px 'Jersey 10', monospace`;
    const measure = this.ctx;
    measure.font = font;
    const pad = Math.ceil(6 * k);
    const width = Math.ceil(measure.measureText(value).width) + pad * 2;
    const height = Math.ceil(px * k * 1.1) + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const cx = width / 2;
    const cy = height / 2;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 5 * k;
    ctx.fillStyle = glow;
    ctx.fillText(value, cx, cy);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, 2.5 * k);
    ctx.strokeStyle = OUTLINE;
    ctx.strokeText(value, cx, cy);
    ctx.fillStyle = core;
    ctx.fillText(value, cx, cy);
    const image = { canvas, w: width / k, h: height / k };
    if (this.texts.size >= TEXT_CACHE) this.texts.delete(this.texts.keys().next().value!);
    this.texts.set(key, image);
    return image;
  }

  /** Halo en escalones de un color (32×32 por defecto), para sumarlo debajo de piezas y objetos. */
  private halo(color: string, size = 32): HTMLCanvasElement {
    const key = `${color}|${size}`;
    let canvas = this.halos.get(key);
    if (!canvas) {
      canvas = radial(color, size);
      this.halos.set(key, canvas);
    }
    return canvas;
  }
}

/** Halo cuadrado de lado `size` en escalones (no un degradado suave: es píxel). */
function radial(color: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (d >= 1) continue;
      // Tres anillos de opacidad, con un tramado en el borde de cada uno
      const band = d < 0.45 ? 0.5 : d < 0.72 ? 0.26 : 0.1;
      const dither = (x + y) % 2 === 0 && [0.45, 0.72].some((b) => Math.abs(d - b) < 0.04);
      ctx.globalAlpha = dither ? band * 0.6 : band;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}
