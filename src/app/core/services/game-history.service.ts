import { inject, Injectable, signal } from '@angular/core';
import { SavedGame } from '../models/game.models';
import { GameRepository, OngoingGame } from '../repositories/game.repository';

@Injectable({ providedIn: 'root' })
export class GameHistoryService {
  private readonly repository = inject(GameRepository);
  readonly games = signal<SavedGame[]>(this.repository.list());

  get(id: string): SavedGame | undefined {
    return this.games().find((g) => g.id === id);
  }

  save(game: SavedGame): void {
    this.repository.save(game);
    this.games.set(this.repository.list());
  }

  clear(): void {
    this.repository.clear();
    this.games.set([]);
  }

  loadOngoing(): OngoingGame | null {
    return this.repository.loadOngoing();
  }

  saveOngoing(game: OngoingGame): void {
    this.repository.saveOngoing(game);
  }

  clearOngoing(): void {
    this.repository.clearOngoing();
  }
}
