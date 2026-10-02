import { Injectable, signal } from '@angular/core';
import { Reward } from '../models/profile.models';

export interface Toast extends Reward {
  id: number;
}

const TOAST_DURATION = 3500;

/** Cola de recompensas: toasts pequeños para XP y celebraciones a pantalla completa para hitos. */
@Injectable({ providedIn: 'root' })
export class RewardsService {
  readonly toasts = signal<Toast[]>([]);
  readonly celebrations = signal<Reward[]>([]);
  private nextId = 1;

  toast(reward: Reward): void {
    const toast = { ...reward, id: this.nextId++ };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismissToast(toast.id), TOAST_DURATION);
  }

  celebrate(reward: Reward): void {
    this.celebrations.update((list) => [...list, reward]);
  }

  dismissToast(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  dismissCelebration(): void {
    this.celebrations.update(([, ...rest]) => rest);
  }
}
