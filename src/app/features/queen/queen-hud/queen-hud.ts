import { Component, computed, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { AbilityId, HudState } from '../queen.models';
import { spriteUrl } from '../render/sprite-url';
import { ENEMY_PALETTES } from '../render/sprites';

/** Marcador de la partida: tiempo, oro, combo, stamina, habilidades y frenesí. */
@Component({
  selector: 'app-queen-hud',
  imports: [Icon],
  templateUrl: './queen-hud.html',
  styleUrl: './queen-hud.scss',
})
export class QueenHud {
  readonly hud = input.required<HudState>();
  readonly frenzyActivate = output<void>();
  readonly abilityUse = output<AbilityId>();
  readonly pauseToggle = output<void>();

  readonly names: Record<AbilityId, string> = { knight: 'Salto de caballo', bishop: 'Rayo del alfil', castle: 'Enroque' };
  /** Cada habilidad lleva su pieza en píxel, con el color de su rama del mapa. */
  readonly sprites: Record<AbilityId, string> = {
    knight: spriteUrl('n', ENEMY_PALETTES.n),
    bishop: spriteUrl('b', { b: '#ff59c7', h: '#ffd6f0', s: '#a3207a', g: '#ffffff' }),
    castle: spriteUrl('r', ENEMY_PALETTES.k),
  };

  private readonly comboEl = viewChild<ElementRef<HTMLElement>>('combo');

  readonly seconds = computed(() => Math.ceil(this.hud().timeLeft));
  readonly timeRatio = computed(() => this.hud().timeLeft / this.hud().runTime);
  readonly lowTime = computed(() => this.hud().timeLeft <= 5 && this.hud().timeLeft > 0);
  /** Una casilla por punto de stamina mientras quepan; con muchas, una barra. */
  readonly pips = computed(() => {
    const { stamina, maxStamina } = this.hud();
    if (maxStamina > 10) return null;
    return Array.from({ length: maxStamina }, (_, i) => Math.max(0, Math.min(1, stamina - i)));
  });
  readonly comboValue = computed(() => this.hud().combo);

  constructor() {
    // Cada eslabón del combo da un saltito al número (animación de compositor, sin repintar el marcador)
    effect(() => {
      const combo = this.comboValue();
      const el = this.comboEl()?.nativeElement;
      if (!el || combo < 2) return;
      const size = Math.min(1.6, 1.15 + combo * 0.02);
      el.animate(
        [
          { transform: `scale(${size}) rotate(${combo % 2 ? -6 : 6}deg)` },
          { transform: 'scale(1) rotate(0deg)' },
        ],
        { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.4)' },
      );
    });
  }
}
