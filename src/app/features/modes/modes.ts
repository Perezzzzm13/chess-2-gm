import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { VARIANTS } from '../../data/variants';

/** Los modos de juego que no son la partida normal. */
@Component({
  selector: 'app-modes',
  imports: [RouterLink],
  templateUrl: './modes.html',
  styleUrl: './modes.scss',
})
export class Modes {
  readonly theme = inject(ProfileService).theme;
  readonly variants = VARIANTS.filter((v) => v.id !== 'clasico');
}
