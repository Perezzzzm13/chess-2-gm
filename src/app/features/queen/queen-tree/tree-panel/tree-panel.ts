import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { BRANCHES, canBuy, Levels, nodeState, TreeNode } from '../../game/tree';
import { enemySpriteUrl } from '../../render/sprite-url';
import { formatGold } from '../tree-format';

/** La ficha de una mejora: qué hace, en qué nivel va y cuánto cuesta la siguiente. */
@Component({
  selector: 'app-tree-panel',
  imports: [Icon],
  templateUrl: './tree-panel.html',
  styleUrl: './tree-panel.scss',
  host: { '[style.--c]': 'color()' },
})
export class TreePanel {
  readonly node = input.required<TreeNode>();
  readonly levels = input.required<Levels>();
  readonly gold = input.required<number>();
  readonly buy = output<string>();
  readonly closed = output<void>();

  readonly level = computed(() => this.levels()[this.node().id] ?? 0);
  readonly state = computed(() => nodeState(this.node(), this.levels()));
  readonly color = computed(() => BRANCHES[this.node().branch].color);
  readonly branch = computed(() => BRANCHES[this.node().branch].name);
  readonly sprite = computed(() => {
    const kind = this.node().sprite;
    return kind ? enemySpriteUrl(kind) : null;
  });
  /** Los nodos lejanos no enseñan qué son: hay que acercarse comprando. */
  readonly secret = computed(() => this.state() === 'locked' || this.state() === 'hidden');
  readonly maxed = computed(() => this.state() === 'maxed');
  readonly cost = computed(() => this.node().cost(this.level()));
  readonly costText = computed(() => formatGold(this.cost()));
  readonly affordable = computed(() => canBuy(this.node(), this.levels(), this.gold()));
  readonly missing = computed(() => formatGold(Math.max(0, this.cost() - this.gold())));
  readonly pips = computed(() => Array.from({ length: this.node().max }, (_, i) => i < this.level()));

  /** "ahora ▸ después"; con un solo nivel o sin comprar, solo lo que da. */
  readonly effect = computed(() => {
    const node = this.node();
    const level = this.level();
    if (node.max === 1 || level === 0) return { now: null, next: node.effect(Math.max(1, level)) };
    if (level >= node.max) return { now: null, next: node.effect(level) };
    return { now: node.effect(level), next: node.effect(level + 1) };
  });

  /** Qué hace falta para abrirla, si aún está lejos. */
  readonly needs = computed(() => this.node().requires.length > 1 ? 'Compra una mejora vecina para abrirla' : 'Compra la mejora anterior para abrirla');
}
