import { Component, computed, input } from '@angular/core';
import { Rank } from '../../../core/models/profile.models';
import { RANKS } from '../../../data/ranks';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Escudo de rango: color del rango, su pieza y el número romano del escalón. */
@Component({
  selector: 'app-rank-emblem',
  templateUrl: './rank-emblem.html',
  styleUrl: './rank-emblem.scss',
})
export class RankEmblem {
  readonly rank = input.required<Rank>();
  readonly size = input(64);
  readonly locked = input(false);

  readonly Math = Math;
  readonly numeral = computed(() => NUMERALS[RANKS.findIndex((r) => r.id === this.rank().id)] ?? '');
}
