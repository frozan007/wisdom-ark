import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Payment } from '../../../features/payments/models/payment';

@Component({
  selector: 'app-reverse-payment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './reverse-payment-dialog.html',
  styleUrl: './reverse-payment-dialog.scss',
})
export class ReversePaymentDialog {
  private readonly formBuilder = inject(FormBuilder);

  private readonly dialogRef =
    inject(
      MatDialogRef<ReversePaymentDialog>
    );

  readonly payment =
    inject<Payment>(MAT_DIALOG_DATA);

  readonly form =
    this.formBuilder.nonNullable.group({
      reason: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(500),
        ],
      ],
    });

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(
      this.form.controls.reason.value.trim()
    );
  }
}
