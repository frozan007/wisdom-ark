import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ReportService } from '../services/report';
import { MonthlyCollectionPoint, PendingPaymentReportRow, ReportsSummary } from '../models/report';
import { ReportExportService } from '../services/report-export.ts';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly loading = signal(true);

  readonly errorMessage = signal('');

  readonly summary = signal<ReportsSummary | null>(null);

  readonly pendingPayments = signal<PendingPaymentReportRow[]>([]);

  readonly collectionTrend = signal<MonthlyCollectionPoint[]>([]);

  private readonly reportExportService = inject(ReportExportService);

  readonly months = [
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

  readonly years =
    Array.from(
      { length: 8 },
      (_, index) =>
        new Date().getFullYear() -
        3 +
        index
    );

  selectedMonth =
    new Date().getMonth() + 1;

  selectedYear =
    new Date().getFullYear();

  readonly maximumTrendValue =
    computed(() => {
      const values =
        this.collectionTrend()
          .flatMap(
            (item) => [
              item.expected,
              item.collected,
            ]
          );

      return Math.max(
        1,
        ...values
      );
    });

  ngOnInit(): void {
    void this.loadReports();
  }

  async periodChanged():
    Promise<void> {
    await this.loadReports();
  }

  monthName(): string {
    return (
      this.months.find(
        (month) =>
          month.value ===
          this.selectedMonth
      )?.label ?? ''
    );
  }

  trendHeight(
    value: number
  ): number {
    return (
      value /
      this.maximumTrendValue()
    ) * 100;
  }

  private async loadReports():
    Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const [
        summary,
        pending,
        trend,
      ] = await Promise.all([
        this.reportService
          .getSummary(
            this.selectedMonth,
            this.selectedYear
          ),

        this.reportService
          .getPendingPayments(
            this.selectedMonth,
            this.selectedYear
          ),

        this.reportService
          .getCollectionTrend(
            this.selectedMonth,
            this.selectedYear,
            6
          ),
      ]);

      this.summary.set(summary);
      this.pendingPayments.set(
        pending
      );

      this.collectionTrend.set(
        trend
      );

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load reports.'
      );

    } finally {
      this.loading.set(false);
    }
  }

  async exportExcel(): Promise<void> {
    const summary =
      this.summary();

    if (!summary) {
      this.errorMessage.set(
        'Report data is not available.'
      );

      return;
    }

    this.errorMessage.set('');

    try {
      await this.reportExportService
        .exportExcel(
          summary,
          this.pendingPayments(),
          this.collectionTrend(),
          this.monthName(),
          this.selectedYear
        );
    } catch (error) {
      this.setExportError(error);
    }
  }

  async exportPdf(): Promise<void> {
    const summary =
      this.summary();

    if (!summary) {
      this.errorMessage.set(
        'Report data is not available.'
      );

      return;
    }

    this.errorMessage.set('');

    try {
      await this.reportExportService
        .exportPdf(
          summary,
          this.pendingPayments(),
          this.collectionTrend(),
          this.monthName(),
          this.selectedYear
        );
    } catch (error) {
      this.setExportError(error);
    }
  }

  private setExportError(
    error: unknown
  ): void {
    console.error(
      'Report export failed:',
      error
    );

    this.errorMessage.set(
      'Unable to export the report. Please try again.'
    );
  }
}
