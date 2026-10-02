import { Component, computed, inject, input } from '@angular/core';
import { Color, PieceType } from '../../../core/models/chess.models';
import { PlayerInfo } from '../../../core/models/game.models';
import { opposite } from '../../../core/chess/chess-utils';
import { ProfileService } from '../../../core/services/profile.service';
import { Portrait } from '../portrait/portrait';

@Component({
  selector: 'app-player-card',
  imports: [Portrait],
  templateUrl: './player-card.html',
  styleUrl: './player-card.scss',
})
export class PlayerCard {
  private readonly profile = inject(ProfileService);

  readonly player = input.required<PlayerInfo>();
  readonly color = input.required<Color>();
  /** Piezas rivales que este jugador ha capturado. */
  readonly captured = input<PieceType[]>([]);
  /** Ventaja material de este jugador (en peones); solo se muestra si es positiva. */
  readonly advantage = input(0);
  readonly active = input(false);
  readonly thinking = input(false);

  readonly capturedPieces = computed(() => this.captured().map((t) => `pieces/${this.profile.theme()}/${opposite(this.color())}${t.toUpperCase()}.webp`));
}
