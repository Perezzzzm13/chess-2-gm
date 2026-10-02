import { EnemyKind } from '../game/enemies';
import { ENEMY_PALETTES, OUTLINE, QUEEN_PALETTE, SPRITE_SIZE, SPRITES, SpritePalette } from './sprites';

const cache = new Map<string, string>();

/** Un sprite como imagen PNG (data URL) para usarlo en el HTML con image-rendering: pixelated. */
export function spriteUrl(kind: EnemyKind, palette: SpritePalette = kind === 'q' ? QUEEN_PALETTE : ENEMY_PALETTES[kind]): string {
  const key = `${kind}|${palette.b}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const colors: Record<string, string> = { o: OUTLINE, ...palette };
  SPRITES[kind].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!colors[ch]) return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

export function enemySpriteUrl(kind: EnemyKind): string {
  return spriteUrl(kind, ENEMY_PALETTES[kind]);
}
