import { Injectable } from '@angular/core';
import { readJson, writeJson } from '../../../core/repositories/local-storage';
import { Levels, START_LEVELS } from './tree';

export interface QueenRecord {
  gold: number;
  captures: number;
  combo: number;
}

export interface QueenSave {
  /** Oro en el bolsillo, listo para gastar en la tienda. */
  gold: number;
  levels: Levels;
  best: QueenRecord;
  totals: { runs: number; captures: number; gold: number };
}

const KEY = 'chess-to-gm.queen.v1';

export function emptySave(): QueenSave {
  return {
    gold: 0,
    levels: { ...START_LEVELS },
    best: { gold: 0, captures: 0, combo: 0 },
    totals: { runs: 0, captures: 0, gold: 0 },
  };
}

/** Progreso de La Reina. Hoy en localStorage; mañana, como el perfil, en la base de datos. */
@Injectable({ providedIn: 'root' })
export class QueenSaveRepository {
  load(): QueenSave {
    const saved = readJson<Partial<QueenSave>>(KEY);
    const empty = emptySave();
    if (!saved) return empty;
    return {
      ...empty,
      ...saved,
      levels: migrate({ ...empty.levels, ...saved.levels }),
      best: { ...empty.best, ...saved.best },
      totals: { ...empty.totals, ...saved.totals },
    };
  }

  save(save: QueenSave): void {
    writeJson(KEY, save);
  }
}

/** La antigua tienda tenía "Rangos" con 5 niveles; en el mapa cada rango es su propio nodo. */
function migrate(levels: Levels): Levels {
  const ranks = levels['ranks'];
  if (ranks === undefined) return levels;
  const { ranks: _, ...rest } = levels;
  ['n', 'b', 'r', 'q', 'k'].slice(0, ranks).forEach((kind) => (rest[`rank-${kind}`] = 1));
  return rest;
}
