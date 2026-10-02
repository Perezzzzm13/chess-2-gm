import { Injectable } from '@angular/core';
import { Color, Uci } from '../models/chess.models';
import { SavedGame } from '../models/game.models';
import { readJson, removeKey, writeJson } from './local-storage';

/** Partida contra bot en curso, para poder retomarla tras recargar la página. */
export interface OngoingGame {
  id: string;
  setupKey: string;
  playerColor: Color;
  moves: Uci[];
}

/** Persistencia del historial de partidas (intercambiable igual que el perfil). */
export abstract class GameRepository {
  abstract list(): SavedGame[];
  abstract save(game: SavedGame): void;
  abstract clear(): void;
  abstract loadOngoing(): OngoingGame | null;
  abstract saveOngoing(game: OngoingGame): void;
  abstract clearOngoing(): void;
}

const KEY = 'chess-to-gm.games.v1';
const ONGOING_KEY = 'chess-to-gm.ongoing.v1';
const MAX_GAMES = 30;

@Injectable()
export class LocalGameRepository extends GameRepository {
  list(): SavedGame[] {
    return readJson<SavedGame[]>(KEY) ?? [];
  }

  save(game: SavedGame): void {
    const games = this.list().filter((g) => g.id !== game.id);
    games.unshift(game);
    writeJson(KEY, games.slice(0, MAX_GAMES));
  }

  clear(): void {
    removeKey(KEY);
  }

  loadOngoing(): OngoingGame | null {
    return readJson<OngoingGame>(ONGOING_KEY);
  }

  saveOngoing(game: OngoingGame): void {
    writeJson(ONGOING_KEY, game);
  }

  clearOngoing(): void {
    removeKey(ONGOING_KEY);
  }
}
