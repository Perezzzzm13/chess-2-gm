// "always": en castellano los números de cuatro cifras no llevan punto por defecto (4000), y aquí se leen mejor con él
const FORMAT = new Intl.NumberFormat('es-ES', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

/** Oro con separador de miles a la española: 12.000. */
export function formatGold(value: number): string {
  return FORMAT.format(Math.round(value));
}
