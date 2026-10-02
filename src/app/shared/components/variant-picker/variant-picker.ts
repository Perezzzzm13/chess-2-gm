import { Component, computed, model } from '@angular/core';
import { variantById, VariantId, VARIANTS } from '../../../data/variants';

/** Selector de modo de juego (clásico o variantes) para preparar una partida. */
@Component({
  selector: 'app-variant-picker',
  templateUrl: './variant-picker.html',
  styleUrl: './variant-picker.scss',
})
export class VariantPicker {
  readonly variant = model<VariantId>('clasico');

  readonly variants = VARIANTS;
  readonly selected = computed(() => variantById(this.variant()));
}
