import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Payment, PaymentMode } from '../models/payment';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../services/payment';
import { MatDialog } from '@angular/material/dialog';
import { ReversePaymentDialog } from '../../../shared/components/reverse-payment-dialog/reverse-payment-dialog';

type MethodFilter =
  | 'all'
  | PaymentMode;

type StatusFilter =
  | 'all'
  | 'active'
  | 'reversed';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-history.html',
  styleUrl: './payment-history.scss',
})
export class PaymentHistory implements OnInit {
  private readonly paymentService = inject(PaymentService);

  private readonly dialog = inject(MatDialog);

  readonly payments = signal<Payment[]>([]);

  readonly loading = signal(true);

  readonly errorMessage = signal('');

  readonly searchTerm = signal('');

  readonly selectedMethod = signal<MethodFilter>('all');

  readonly selectedStatus = signal<StatusFilter>('all');

  readonly selectedMonth = signal(0);

  readonly selectedYear = signal(0);

  readonly months = [
    { value: 0, label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly years = [
    0,
    ...Array.from(
      { length: 8 },
      (_, index) =>
        new Date().getFullYear() -
        3 +
        index
    ),
  ];

  readonly filteredPayments =
    computed(() => {
      const search =
        this.searchTerm()
          .trim()
          .toLowerCase();

      return this.payments().filter(
        (payment) => {
          const studentName =
            payment.students
              ?.student_name
              ?.toLowerCase() ?? '';

          const matchesSearch =
            !search ||
            studentName.includes(search) ||
            payment.reference_number
              ?.toLowerCase()
              .includes(search) ||
            payment.remarks
              ?.toLowerCase()
              .includes(search);

          const matchesMethod =
            this.selectedMethod() === 'all' ||
            payment.payment_mode ===
            this.selectedMethod();

          const matchesMonth =
            this.selectedMonth() === 0 ||
            payment.fee_month ===
            Number(this.selectedMonth());

          const matchesYear =
            this.selectedYear() === 0 ||
            payment.fee_year ===
            Number(this.selectedYear());

          const matchesStatus =
            this.selectedStatus() === 'all' ||
            (
              this.selectedStatus() === 'active' &&
              !payment.is_reversed
            ) ||
            (
              this.selectedStatus() === 'reversed' &&
              payment.is_reversed
            );

          return (
            matchesSearch &&
            matchesMethod &&
            matchesMonth &&
            matchesYear &&
            matchesStatus
          );
        }
      );
    });

  readonly visibleTotal =
    computed(() =>
      this.filteredPayments()
        .filter(
          (payment) =>
            !payment.is_reversed
        )
        .reduce(
          (total, payment) =>
            total +
            Number(payment.amount),
          0
        )
    );

  ngOnInit(): void {
    void this.loadPayments();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedMethod.set('all');
    this.selectedStatus.set('all');
    this.selectedMonth.set(0);
    this.selectedYear.set(0);
  }

  async viewProof(
    payment: Payment
  ): Promise<void> {
    if (!payment.proof_image_path) {
      return;
    }

    try {
      const url =
        await this.paymentService
          .getProofUrl(
            payment.proof_image_path
          );

      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      this.setError(error);
    }
  }

  reversePayment(
    payment: Payment
  ): void {
    if (payment.is_reversed) {
      return;
    }

    const dialogRef =
      this.dialog.open(
        ReversePaymentDialog,
        {
          width: '520px',
          maxWidth: '94vw',
          data: payment,
        }
      );

    dialogRef
      .afterClosed()
      .subscribe(
        async (
          reason:
            string | undefined
        ) => {
          if (!reason) {
            return;
          }

          try {
            await this.paymentService
              .reversePayment(
                payment.id,
                reason
              );

            await this.loadPayments();
          } catch (error) {
            this.setError(error);
          }
        }
      );
  }

  monthName(month: number): string {
    return (
      this.months.find(
        (item) =>
          item.value === month
      )?.label ?? ''
    );
  }

  private async loadPayments():
    Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.payments.set(
        await this.paymentService
          .getPaymentHistory()
      );
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private setError(error: unknown): void {
    this.errorMessage.set(
      error instanceof Error
        ? error.message
        : 'Unable to load payment history.'
    );
  }
}
