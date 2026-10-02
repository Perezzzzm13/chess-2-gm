import { Component, computed, inject } from '@angular/core';
import { BoardTheme } from '../../core/models/profile.models';
import { xpForLevel } from '../../core/progression/progression';
import { ProfileService } from '../../core/services/profile.service';
import { BOARD_THEMES } from '../../data/board-themes';
import { Board } from '../../shared/components/board/board';

/** Posición de muestra con todas las piezas a la vista. */
const PREVIEW_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1';

@Component({
  selector: 'app-themes',
  imports: [Board],
  templateUrl: './themes.html',
  styleUrl: './themes.scss',
})
export class Themes {
  readonly profile = inject(ProfileService);
  readonly previewFen = PREVIEW_FEN;

  readonly themes = computed(() =>
    BOARD_THEMES.map((theme) => ({
      ...theme,
      unlocked: this.profile.isUnlocked(theme),
      active: this.profile.theme() === theme.id,
      xpLeft: Math.max(0, xpForLevel(theme.requiredLevel) - this.profile.profile().xp),
      progress: Math.min(1, this.profile.profile().xp / (xpForLevel(theme.requiredLevel) || 1)),
    })),
  );

  select(theme: BoardTheme): void {
    if (this.profile.isUnlocked(theme)) this.profile.update({ boardTheme: theme.id });
  }
}
