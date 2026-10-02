import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ProfileService } from '../../core/services/profile.service';
import { Icon } from '../../shared/components/icon/icon';
import { QueenSave, QueenSaveRepository } from './game/queen-save';
import { QueenSfx } from './game/queen-sfx';
import { canBuy, statsFor, TREE, TREE_BY_ID } from './game/tree';
import { QueenArena } from './queen-arena/queen-arena';
import { RunResult } from './queen.models';
import { QueenResults } from './queen-results/queen-results';
import { QueenTree } from './queen-tree/queen-tree';
import { TreeMinimap } from './queen-tree/tree-minimap/tree-minimap';
import { spriteUrl } from './render/sprite-url';

type View = 'hub' | 'map' | 'run';

/**
 * La Reina: incremental de caza. Partidas cortas contra reloj para conseguir oro
 * y un mapa de mejoras gigante entre partidas para mejorar a la reina y desbloquear habilidades.
 */
@Component({
  selector: 'app-queen',
  imports: [Icon, QueenArena, QueenResults, QueenTree, TreeMinimap],
  templateUrl: './queen.html',
  styleUrl: './queen.scss',
  host: { '(window:keydown)': 'onKey($event)' },
})
export class Queen {
  private readonly repository = inject(QueenSaveRepository);
  private readonly profile = inject(ProfileService);
  private readonly sfx = new QueenSfx(() => this.profile.profile().soundOn);

  readonly save = signal<QueenSave>(this.repository.load());
  readonly view = signal<View>('hub');
  /** Cambia en cada partida para crear una arena nueva. */
  readonly runId = signal(0);
  readonly result = signal<RunResult | null>(null);
  readonly records = signal({ gold: false, combo: false });
  /** Última mejora mirada en el mapa: al volver, el mapa se abre ahí. */
  readonly focus = signal<string | null>(null);

  readonly stats = computed(() => statsFor(this.save().levels));
  readonly veteran = computed(() => this.save().totals.runs > 0);
  /** Mejoras que se pueden comprar ahora mismo. */
  readonly affordable = computed(() => {
    const { gold, levels } = this.save();
    return TREE.filter((node) => canBuy(node, levels, gold)).length;
  });
  readonly canUpgrade = computed(() => this.affordable() > 0);
  readonly owned = computed(() => TREE.filter((node) => (this.save().levels[node.id] ?? 0) > 0).length);
  readonly totalNodes = TREE.length;
  readonly queenSprite = spriteUrl('q');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.sfx.destroy());
  }

  play(): void {
    this.result.set(null);
    this.runId.update((n) => n + 1);
    this.view.set('run');
  }

  toHub(): void {
    this.result.set(null);
    this.view.set('hub');
  }

  toMap(): void {
    this.result.set(null);
    this.view.set('map');
  }

  onFinished(run: RunResult): void {
    const save = this.save();
    // Solo hay récord que batir a partir de la segunda partida
    const veteran = save.totals.runs > 0;
    this.records.set({ gold: veteran && run.gold > save.best.gold, combo: veteran && run.bestCombo > save.best.combo });
    this.persist({
      ...save,
      gold: save.gold + run.gold,
      best: {
        gold: Math.max(save.best.gold, run.gold),
        captures: Math.max(save.best.captures, run.captures),
        combo: Math.max(save.best.combo, run.bestCombo),
      },
      totals: {
        runs: save.totals.runs + 1,
        captures: save.totals.captures + run.captures,
        gold: save.totals.gold + run.gold,
      },
    });
    this.result.set(run);
    // Un poco de experiencia para el perfil general: la caza también entrena la vista
    if (run.captures >= 5) this.profile.addXp(Math.min(25, 3 + Math.floor(run.captures / 6)), 'La Reina');
  }

  buy(id: string): void {
    const save = this.save();
    const node = TREE_BY_ID[id];
    if (!node || !canBuy(node, save.levels, save.gold)) return;
    const level = save.levels[id] ?? 0;
    const cost = node.cost(level);
    this.sfx.buy();
    this.persist({ ...save, gold: save.gold - cost, levels: { ...save.levels, [id]: level + 1 } });
  }

  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, a, textarea')) return;
    // En el cartel, en el mapa o en el resumen, Intro empieza otra partida
    if (event.code === 'Enter' && (this.view() !== 'run' || this.result())) {
      event.preventDefault();
      this.play();
    }
  }

  private persist(save: QueenSave): void {
    this.save.set(save);
    this.repository.save(save);
  }
}
