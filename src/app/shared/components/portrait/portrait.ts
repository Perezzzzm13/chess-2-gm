import { Component, input } from '@angular/core';
import { PieceType } from '../../../core/models/chess.models';

/** Retrato de jugador o bot: una pieza sobre un medallón de color con aro de oro. */
@Component({
  selector: 'app-portrait',
  templateUrl: './portrait.html',
  styleUrl: './portrait.scss',
  host: { '[style.--size.px]': 'size()', '[style.--tint]': 'tint() ?? "#7a6a5a"' },
})
export class Portrait {
  // Opcionales: las partidas guardadas con versiones antiguas no tienen retrato
  readonly piece = input<PieceType | undefined>('p');
  readonly tint = input<string | undefined>('#7a6a5a');
  readonly size = input(56);
}
