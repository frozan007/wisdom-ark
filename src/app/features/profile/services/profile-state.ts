import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ProfileStateService {
  readonly profileImageUrl = signal<string | null>(null);

  setProfileImageUrl(
    url: string | null
  ): void {
    this.profileImageUrl.set(url);
  }

  clear(): void {
    this.profileImageUrl.set(null);
  }
}
