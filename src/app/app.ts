import { Location } from '@angular/common';
import { Component, inject, Injector, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  App as CapacitorApp,
} from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { SupabaseService } from './core/services/supabase';
import {
  StatusBar,
  Style,
} from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('wisdom-ark');
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);

  private readonly location = inject(Location);
  private readonly injector = inject(Injector);

  /** Back on these screens closes the app. */
  private readonly exitRoutes = ['/', '/login', '/app/dashboard'];

  /** Back on these screens returns to the dashboard instead of stepping through tab history. */
  private readonly topLevelRoutes = [
    '/app/students',
    '/app/schedule',
    '/app/payments',
    '/app/notes',
    '/app/reports',
    '/app/profile',
  ];

  /** Back on these screens returns to login. */
  private readonly authRoutes = ['/signup', '/forgot-password', '/reset-password'];

  ngOnInit(): void {
    this.setupDeepLinks();
    this.setupBackButton();
    void this.setupNativeUi();
  }

  private setupBackButton(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    void CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      if (await this.closeOpenOverlay()) {
        return;
      }

      const path = this.router.url.split(/[?#]/)[0];

      if (this.exitRoutes.includes(path)) {
        void CapacitorApp.exitApp();
        return;
      }

      if (this.topLevelRoutes.includes(path)) {
        void this.router.navigate(['/app/dashboard'], { replaceUrl: true });
        return;
      }

      if (this.authRoutes.includes(path)) {
        void this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      if (canGoBack) {
        this.location.back();
        return;
      }

      void this.router.navigate(['/app/dashboard'], { replaceUrl: true });
    });
  }

  /**
   * Closes an open dialog or bottom sheet, if any. Material is loaded on
   * demand to keep it out of the startup bundle; both services are root
   * singletons, so these are the same instances the pages opened them with.
   */
  private async closeOpenOverlay(): Promise<boolean> {
    if (!document.querySelector('.cdk-overlay-pane')) {
      return false;
    }

    const [{ MatDialog }, { MatBottomSheet }] = await Promise.all([
      import('@angular/material/dialog'),
      import('@angular/material/bottom-sheet'),
    ]);

    const dialog = this.injector.get(MatDialog);

    if (dialog.openDialogs.length > 0) {
      dialog.closeAll();
      return true;
    }

    const bottomSheet = this.injector.get(MatBottomSheet);

    if (bottomSheet._openedBottomSheetRef) {
      bottomSheet.dismiss();
      return true;
    }

    return false;
  }

  private setupDeepLinks(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    void CapacitorApp.addListener(
      'appUrlOpen',
      async ({ url }) => {

        if (
          !url.startsWith(
            'wisdomark://reset-password'
          )
        ) {
          return;
        }

        try {
          /*
           * Supabase recovery links normally
           * place the auth values after #.
           *
           * Example:
           *
           * wisdomark://reset-password
           * #access_token=...
           * &refresh_token=...
           * &type=recovery
           */

          const hashIndex =
            url.indexOf('#');

          if (hashIndex === -1) {
            await this.router.navigate([
              '/reset-password',
            ]);

            return;
          }

          const hash =
            url.substring(
              hashIndex + 1
            );

          const params =
            new URLSearchParams(hash);

          const accessToken =
            params.get(
              'access_token'
            );

          const refreshToken =
            params.get(
              'refresh_token'
            );

          const type =
            params.get('type');

          if (
            type === 'recovery' &&
            accessToken &&
            refreshToken
          ) {
            const {
              error,
            } =
              await this.supabaseService
                .setSession(
                  accessToken,
                  refreshToken
                );

            if (error) {
              console.error(
                'Unable to establish recovery session:',
                error
              );
            }
          }

          await this.router.navigate([
            '/reset-password',
          ]);

        } catch (error) {
          console.error(
            'Unable to process password reset link:',
            error
          );

          await this.router.navigate([
            '/reset-password',
          ]);
        }
      }
    );
  }

  private async setupNativeUi(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // The splash page normally hides the native splash. This is a fallback
    // in case the app opens on another route or the session check hangs.
    setTimeout(() => void SplashScreen.hide(), 5000);

    try {
      await StatusBar.setOverlaysWebView({
        overlay: false,
      });

      await StatusBar.setBackgroundColor({
        color: '#0F4F2A',
      });

      await StatusBar.setStyle({
        style: Style.Light,
      });
    } catch (error) {
      console.error(
        'Unable to configure native UI:',
        error
      );
    }
  }
}
