import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ColorChoice } from '../../core/models/chess.models';
import { ProfileService } from '../../core/services/profile.service';
import { BotProfile, BOTS, customBot, MAX_BOT_ELO, MIN_BOT_ELO } from '../../data/bots';
import { variantById, VariantId } from '../../data/variants';
import { Icon } from '../../shared/components/icon/icon';
import { VariantPicker } from '../../shared/components/variant-picker/variant-picker';
import { Portrait } from '../../shared/components/portrait/portrait';

@Component({
  selector: 'app-bots',
  imports: [Portrait, Icon, VariantPicker],
  templateUrl: './bots.html',
  styleUrl: './bots.scss',
})
export class Bots {
  private readonly router = inject(Router);
  readonly profile = inject(ProfileService);

  /** Modo pedido desde la página de Modos (?variante=caballeria). */
  readonly variantParam = input<string>(undefined, { alias: 'variante' });
  readonly variant = linkedSignal<VariantId>(() => variantById(this.variantParam()).id);

  readonly bots = BOTS;
  readonly minElo = MIN_BOT_ELO;
  readonly maxElo = MAX_BOT_ELO;

  readonly selectedId = signal<string>(this.suggestedBot().id);
  readonly customElo = signal(this.profile.profile().rating);
  readonly color = signal<ColorChoice>('random');
  readonly feedback = signal(this.profile.profile().feedbackByDefault);

  readonly colorOptions: { value: ColorChoice; label: string }[] = [
    { value: 'w', label: 'Blancas' },
    { value: 'random', label: 'Al azar' },
    { value: 'b', label: 'Negras' },
  ];

  readonly selected = computed<BotProfile>(() =>
    this.selectedId() === 'custom' ? customBot(this.customElo()) : (BOTS.find((b) => b.id === this.selectedId()) ?? BOTS[0]),
  );

  /** El bot con ELO más cercano al del jugador. */
  private suggestedBot(): BotProfile {
    const rating = this.profile.profile().rating;
    return BOTS.reduce((best, b) => (Math.abs(b.elo - rating) < Math.abs(best.elo - rating) ? b : best));
  }

  isSuggested(bot: BotProfile): boolean {
    return bot.id === this.suggestedBot().id;
  }

  onCustomElo(event: Event): void {
    this.customElo.set(Number((event.target as HTMLInputElement).value));
    this.selectedId.set('custom');
  }

  play(): void {
    const bot = this.selected();
    this.profile.update({ feedbackByDefault: this.feedback() });
    this.router.navigate(['/partida'], {
      queryParams: {
        bot: bot.id === 'custom' ? null : bot.id,
        elo: bot.id === 'custom' ? bot.elo : null,
        color: this.color(),
        feedback: this.feedback() ? 1 : 0,
        variante: this.variant() === 'clasico' ? null : this.variant(),
      },
    });
  }
}
