import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconName, ICONS } from '../../../data/icons';

/** Icono de silueta (game-icons.net). Toma el color del texto (currentColor). */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: { '[style.--icon-size]': 'size()' },
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  /** Tamaño en cualquier unidad CSS. Sin él manda la variable --icon-size del CSS (por defecto, 1em). */
  readonly size = input<string>();

  // El SVG lo generamos nosotros en scripts/build-icons.mjs: es contenido de confianza
  readonly svg = computed<SafeHtml>(() => {
    const icon = ICONS[this.name()];
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.size} ${icon.size}" aria-hidden="true">${icon.body}</svg>`,
    );
  });
}
