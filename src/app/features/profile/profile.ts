import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlayerInfo, SavedGame } from '../../core/models/game.models';
import { scoreFor } from '../../core/progression/progression';
import { GameHistoryService } from '../../core/services/game-history.service';
import { ProfileService } from '../../core/services/profile.service';
import { RANKS } from '../../data/ranks';
import { Icon } from '../../shared/components/icon/icon';
import { Portrait } from '../../shared/components/portrait/portrait';
import { RankEmblem } from '../../shared/components/rank-emblem/rank-emblem';

@Component({
  selector: 'app-profile',
  imports: [RankEmblem, RouterLink, DatePipe, Icon, Portrait],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfilePage {
  readonly profile = inject(ProfileService);
  readonly history = inject(GameHistoryService);

  readonly ranks = RANKS;
  readonly editing = signal(false);
  readonly confirmReset = signal(false);

  readonly winRate = computed(() => {
    const s = this.profile.profile().stats;
    return s.games ? Math.round((s.wins / s.games) * 100) : 0;
  });

  isReached(minRating: number): boolean {
    return this.profile.profile().rating >= minRating;
  }

  outcome(game: SavedGame): { label: string; tone: string } {
    const score = scoreFor(game.result, game.playerColor);
    if (score === 1) return { label: 'Victoria', tone: 'win' };
    if (score === 0.5) return { label: 'Tablas', tone: 'draw' };
    return { label: 'Derrota', tone: 'loss' };
  }

  opponent(game: SavedGame): PlayerInfo {
    return game.playerColor === 'w' ? game.black : game.white;
  }

  opponentOf(game: SavedGame): string {
    const opp = this.opponent(game);
    return `${opp.name}${opp.rating ? ' (' + opp.rating + ')' : ''}`;
  }

  saveName(value: string): void {
    const name = value.trim().slice(0, 24);
    if (name) this.profile.update({ name });
    this.editing.set(false);
  }

  reset(): void {
    if (!this.confirmReset()) {
      this.confirmReset.set(true);
      return;
    }
    this.profile.reset();
    this.history.clear();
    this.confirmReset.set(false);
  }
}
