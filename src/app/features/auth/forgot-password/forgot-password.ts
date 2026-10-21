import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly formBuilder = inject(FormBuilder);

  private readonly supabaseService =  inject(SupabaseService);

  readonly loading = signal(false);

  readonly errorMessage = signal('');

  readonly successMessage = signal('');

  readonly form =
    this.formBuilder.nonNullable.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
    });

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      const { error } =
        await this.supabaseService
          .sendPasswordReset(
            this.form.controls.email.value
          );

      if (error) {
        throw error;
      }

      /*
       * Deliberately generic.
       * Don't reveal whether an account
       * exists for a particular email.
       */
      this.successMessage.set(
        'If an account exists for this email, a password reset link has been sent.'
      );

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to send reset email.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
