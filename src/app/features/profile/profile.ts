import { Component, inject, OnInit, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileService } from './services/profile';
import { ProfileStateService } from './services/profile-state';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  private readonly profileService = inject(ProfileService);

  private readonly formBuilder = inject(FormBuilder);

  private readonly router = inject(Router);

  readonly email = signal('');

  readonly loading = signal(true);

  readonly saving = signal(false);

  readonly loggingOut = signal(false);

  readonly errorMessage = signal('');

  readonly successMessage = signal('');

  readonly uploadingImage = signal(false);

  readonly profileImagePath = signal<string | null>(null);

  private readonly profileState = inject(ProfileStateService);

  readonly profileImageUrl = this.profileState.profileImageUrl;

  readonly form =
    this.formBuilder.nonNullable.group({
      full_name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
        ],
      ],

      tuition_name: [''],

      phone: [
        '',
        [
          Validators.pattern(
            /^[0-9]{10}$/
          ),
        ],
      ],

      address: [''],
    });

  ngOnInit(): void {
    void this.loadProfile();
  }

  async save(): Promise<void> {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      await this.profileService
        .saveProfile(
          this.form.getRawValue()
        );

      this.successMessage.set(
        'Profile updated successfully.'
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to update profile.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loggingOut.set(true);

    try {
      await this.supabaseService.signOut();
      this.profileState.clear();
      await this.router.navigate([
        '/login',
      ]);
    } finally {
      this.loggingOut.set(false);
    }
  }

  private async loadProfile():
    Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const {
        data: { user },
      } =
        await this.supabaseService
          .getUser();

      if (!user) {
        throw new Error(
          'User not found.'
        );
      }

      this.email.set(
        user.email ?? ''
      );

      const profile =
        await this.profileService
          .getProfile();

      this.profileImagePath.set(
        profile?.profile_image_path ??
        null
      );

      if (
        profile?.profile_image_path
      ) {
        const imageUrl =
          await this.profileService
            .getProfileImageUrl(
              profile.profile_image_path
            );

        this.profileImageUrl.set(
          imageUrl
        );
      }

      this.form.patchValue({
        full_name:
          profile?.full_name ??
          user.user_metadata?.['full_name'] ??
          user.email?.split('@')[0] ??
          '',

        tuition_name:
          profile?.tuition_name ?? '',

        phone:
          profile?.phone ?? '',

        address:
          profile?.address ?? '',
      });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load profile.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async onProfileImageSelected(
    event: Event
  ): Promise<void> {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      this.errorMessage.set(
        'Profile image must be JPEG, PNG or WebP.'
      );

      input.value = '';
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      this.errorMessage.set(
        'Profile image must not exceed 5 MB.'
      );

      input.value = '';
      return;
    }

    this.uploadingImage.set(true);

    try {
      const path =
        await this.profileService
          .uploadProfileImage(file);

      this.profileImagePath.set(
        path
      );

      const url =
        await this.profileService
          .getProfileImageUrl(
            path
          );

      this.profileImageUrl.set(
        url
      );

      this.successMessage.set(
        'Profile image updated.'
      );

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to upload profile image.'
      );
    } finally {
      this.uploadingImage.set(
        false
      );
    }
  }

  async removeProfileImage():
    Promise<void> {
    const path =
      this.profileImagePath();

    if (!path) {
      return;
    }

    this.uploadingImage.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.profileService
        .removeProfileImage(path);

      this.profileImagePath.set(
        null
      );

      this.profileImageUrl.set(
        null
      );

      this.successMessage.set(
        'Profile image removed.'
      );

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to remove profile image.'
      );
    } finally {
      this.uploadingImage.set(
        false
      );
    }
  }
}
