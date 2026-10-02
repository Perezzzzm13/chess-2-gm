import { Component, computed, inject } from '@angular/core';
import { RewardsService } from '../../../core/services/rewards.service';
import { RewardKind } from '../../../core/models/profile.models';
import { IconName } from '../../../data/icons';
import { Icon } from '../icon/icon';

const ICONS: Record<RewardKind, IconName> = {
  xp: 'sparkles',
  level: 'levelUp',
  rank: 'crown',
  unlock: 'key',
  rating: 'trophy',
};

const RIBBONS: Record<RewardKind, string> = {
  xp: 'Recompensa',
  level: '¡Subes de nivel!',
  rank: '¡Nuevo rango!',
  unlock: '¡Desbloqueado!',
  rating: 'Recompensa',
};

@Component({
  selector: 'app-rewards-overlay',
  imports: [Icon],
  templateUrl: './rewards-overlay.html',
  styleUrl: './rewards-overlay.scss',
})
export class RewardsOverlay {
  readonly rewards = inject(RewardsService);
  readonly celebration = computed(() => this.rewards.celebrations()[0] ?? null);

  icon(kind: RewardKind): IconName {
    return ICONS[kind];
  }

  ribbon(kind: RewardKind): string {
    return RIBBONS[kind];
  }
}
