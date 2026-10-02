import { BoardTheme } from '../core/models/profile.models';

/** Tema por defecto, y al que se vuelve si el guardado apunta a uno que ya no existe. */
export const DEFAULT_BOARD_THEME = 'neon';

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'neon',
    name: 'Neón',
    description: 'Tinta negra y tubos encendidos: marfil y oro contra carmesí.',
    requiredLevel: 1,
  },
  {
    id: 'pixel',
    name: 'Píxel',
    description: 'Dieciséis por dieciséis. Como en la recreativa del bar.',
    requiredLevel: 1,
  },
  {
    id: 'wood',
    name: 'Madera',
    description: 'El de toda la vida, para quien no quiere distracciones.',
    requiredLevel: 1,
  },
  {
    id: 'graffiti',
    name: 'Graffiti',
    description: 'Hormigón, asfalto y piezas de pegatina.',
    requiredLevel: 4,
  },
  {
    id: 'synth',
    name: 'Synthwave',
    description: 'Cromado ochentero sobre una rejilla que no se acaba.',
    requiredLevel: 7,
  },
  {
    id: 'throne',
    name: 'Trono',
    description: 'Oro macizo contra obsidiana. Para quien ya manda.',
    requiredLevel: 10,
  },
];
