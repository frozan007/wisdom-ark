import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  App as CapacitorApp,
} from '@capacitor/app';
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

  ngOnInit(): void {
    this.setupDeepLinks();
    void this.setupNativeUi();
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
