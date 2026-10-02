import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color } from '../../core/models/chess.models';
import { ProfileService } from '../../core/services/profile.service';
import { OPENINGS } from '../../data/openings';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-openings',
  imports: [RouterLink, Icon],
  templateUrl: './openings.html',
  styleUrl: './openings.scss',
})
export class Openings {
  readonly profile = inject(ProfileService);
  readonly filter = signal<Color | 'all'>('all');

  readonly openings = computed(() => {
    const f = this.filter();
    return OPENINGS.filter((o) => f === 'all' || o.side === f).map((o) => ({
      ...o,
      stars: this.profile.profile().openings[o.id]?.stars ?? 0,
      preview: o.steps
        .slice(0, 6)
        .map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s.san}` : s.san))
        .join(' '),
    }));
  });

  readonly mastered = computed(() => Object.values(this.profile.profile().openings).filter((o) => o.stars === 3).length);
  readonly total = OPENINGS.length;

  difficulty(level: number): string {
    return ['', 'Iniciación', 'Intermedia', 'Avanzada'][level];
  }
}
