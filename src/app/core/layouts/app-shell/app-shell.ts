import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileService } from '../../../features/profile/services/profile';
import { ProfileStateService } from '../../../features/profile/services/profile-state';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  /** Shorter label for the bottom tab bar. */
  shortLabel?: string;
  /** Shown in the side menu only, to keep the bottom bar to five tabs. */
  menuOnly?: boolean;
}

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly isMobile = signal(true);
  readonly drawerOpened = signal(false);
  readonly userEmail = signal('');
  readonly loggingOut = signal(false);

  private readonly profileService = inject(ProfileService);

  private readonly profileState = inject(ProfileStateService);

  readonly profileImageUrl = this.profileState.profileImageUrl;

  readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: 'dashboard',
      route: '/app/dashboard',
      exact: true,
    },
    {
      label: 'Students',
      icon: 'school',
      route: '/app/students',
    },
    {
      label: 'Schedule',
      icon: 'calendar_month',
      route: '/app/schedule',
    },
    {
      label: 'Payments',
      icon: 'payments',
      route: '/app/payments',
    },
    {
      label: 'Notes',
      icon: 'note_alt',
      route: '/app/notes',
    },
    {
      label: 'Reports',
      icon: 'analytics',
      route: '/app/reports',
      menuOnly: true,
    },
  ];

  readonly bottomNavigationItems = this.navigationItems.filter(
    (item) => !item.menuOnly
  );

  ngOnInit(): void {
    this.observeScreenSize();
    void this.loadUser();
    void this.loadProfileImage();
  }

  toggleDrawer(): void {
    this.drawerOpened.update((opened) => !opened);
  }

  closeDrawerOnMobile(): void {
    if (this.isMobile()) {
      this.drawerOpened.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    try {
      const { error } = await this.supabaseService.signOut();

      if (error) {
        console.error('Logout failed:', error.message);
        return;
      }
      this.profileState.clear();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.loggingOut.set(false);
    }
  }

  private observeScreenSize(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .subscribe(({ matches }) => {
        this.isMobile.set(matches);
        this.drawerOpened.set(!matches);
      });
  }

  private async loadUser(): Promise<void> {
    const {
      data: { user },
    } = await this.supabaseService.getUser();

    this.userEmail.set(user?.email ?? 'Administrator');
  }

  private async loadProfileImage():
    Promise<void> {
    try {
      const profile =
        await this.profileService.getProfile();

      if (!profile?.profile_image_path) {
        this.profileState
          .setProfileImageUrl(null);

        return;
      }

      const url =
        await this.profileService
          .getProfileImageUrl(
            profile.profile_image_path
          );

      this.profileState
        .setProfileImageUrl(url);

    } catch (error) {
      console.error(
        'Unable to load profile image:',
        error
      );

      this.profileState
        .setProfileImageUrl(null);
    }
  }
}
