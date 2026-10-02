import { Injectable } from '@angular/core';
import { Profile } from '../models/profile.models';
import { readJson, removeKey, writeJson } from './local-storage';

/**
 * Persistencia del perfil. Hoy usa localStorage; cuando haya usuarios y base de datos
 * basta con crear otra implementación (p. ej. HttpProfileRepository) y cambiar el provider.
 */
export abstract class ProfileRepository {
  abstract load(): Profile | null;
  abstract save(profile: Profile): void;
  abstract clear(): void;
}

const KEY = 'chess-to-gm.profile.v1';

@Injectable()
export class LocalProfileRepository extends ProfileRepository {
  load(): Profile | null {
    return readJson<Profile>(KEY);
  }

  save(profile: Profile): void {
    writeJson(KEY, profile);
  }

  clear(): void {
    removeKey(KEY);
  }
}
