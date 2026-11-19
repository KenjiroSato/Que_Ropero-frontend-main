import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(document.documentElement.dataset['theme'] !== 'light');
  toggle(): void {
    this.dark.update((value) => !value);
    const theme = this.dark() ? 'dark' : 'light';
    document.documentElement.dataset['theme'] = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.dark() ? '#10141f' : '#e8edf5');
    try {
      localStorage.setItem('qr-theme', theme);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }
}
