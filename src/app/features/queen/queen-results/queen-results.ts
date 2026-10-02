import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { ENEMY_ORDER } from '../game/enemies';
import { RunResult } from '../queen.models';
import { enemySpriteUrl } from '../render/sprite-url';

/** Resumen al acabar el tiempo, encima del tablero congelado. */
@Component({
  selector: 'app-queen-results',
  imports: [Icon],
  templateUrl: './queen-results.html',
  styleUrl: './queen-results.scss',
})
export class QueenResults {
  readonly result = input.required<RunResult>();
  /** Qué récords ha batido esta partida. */
  readonly records = input<{ gold: boolean; combo: boolean }>({ gold: false, combo: false });
  /** Oro total en el bolsillo tras cobrar. */
  readonly banked = input.required<number>();
  /** ¿Puede comprar alguna mejora con lo que tiene? */
  readonly canUpgrade = input(false);

  readonly again = output<void>();
  readonly shop = output<void>();

  /** Capturas y combo siempre; críticos, doradas y muros solo si ha habido. */
  readonly stats = computed(() => {
    const r = this.result();
    const all = [
      { label: 'Capturas', value: r.captures, record: false, always: true },
      { label: 'Mejor combo', value: `x${r.bestCombo}`, record: this.records().combo, always: true },
      { label: 'Críticos', value: r.crits, record: false, always: false },
      { label: 'Doradas', value: r.golden, record: false, always: false },
      { label: 'Muros rotos', value: r.walls, record: false, always: false },
    ];
    return all.filter((s) => s.always || Number(s.value) > 0);
  });

  readonly pieces = computed(() =>
    ENEMY_ORDER.filter((k) => this.result().byKind[k] > 0).map((k) => ({ kind: k, count: this.result().byKind[k], sprite: enemySpriteUrl(k) })),
  );
}
