import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { GameRepository, LocalGameRepository } from './core/repositories/game.repository';
import { LocalProfileRepository, ProfileRepository } from './core/repositories/profile.repository';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es' },
    // Hash routing: los enlaces de invitación funcionan en cualquier hosting estático
    provideRouter(routes, withHashLocation(), withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Persistencia local. Para usar base de datos, sustituir por implementaciones HTTP.
    { provide: ProfileRepository, useClass: LocalProfileRepository },
    { provide: GameRepository, useClass: LocalGameRepository },
  ],
};
