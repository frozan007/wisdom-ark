import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase';
import { StudentService } from '../students/services/student';
import { ScheduleService } from '../schedule/services/schedule';
import { Schedule } from '../schedule/models/schedule';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../payments/services/payment';
import { NoteService } from '../notes/services/note';
import { Note, NoteType } from '../notes/models/note';
import { Payment } from '../payments/models/payment';

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  modifier: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterLink
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  readonly today = new Date();
  readonly displayName = signal('Administrator');
  private readonly studentService = inject(StudentService);
  private readonly scheduleService = inject(ScheduleService);
  readonly todaySchedules = signal<Schedule[]>([]);
  readonly scheduleLoading = signal(true);
  private readonly paymentService = inject(PaymentService);
  private readonly noteService = inject(NoteService);
  readonly academicNotes = signal<Note[]>([]);
  readonly academicLoading = signal(true);
  readonly todayKey = this.getLocalDateString();
  readonly recentPayments = signal<Payment[]>([]);
  readonly paymentsLoading = signal(true);
  readonly metrics = signal<DashboardMetric[]>([
    {
      label: 'Total students',
      value: '0',
      icon: 'groups',
      modifier: 'green',
    },
    {
      label: "Today's classes",
      value: '0',
      icon: 'calendar_month',
      modifier: 'blue',
    },
    {
      label: 'Pending fees',
      value: '₹0',
      icon: 'pending_actions',
      modifier: 'orange',
    },
    {
      label: 'Collected this month',
      value: '₹0',
      icon: 'account_balance_wallet',
      modifier: 'gold',
    },
  ]);

  readonly overdueAcademicNotes =
    computed(() =>
      this.academicNotes().filter(
        (note) =>
          note.status === 'pending' &&
          !!note.due_date &&
          note.due_date < this.todayKey
      )
    );

  readonly dueTodayAcademicNotes =
    computed(() =>
      this.academicNotes().filter(
        (note) =>
          note.status === 'pending' &&
          note.due_date === this.todayKey
      )
    );

  readonly pendingFollowUps =
    computed(() =>
      this.academicNotes().filter(
        (note) =>
          note.status === 'pending' &&
          note.note_type === 'follow_up'
      )
    );

  readonly upcomingAcademicTasks =
    computed(() =>
      this.academicNotes()
        .filter(
          (note) =>
            note.status === 'pending' &&
            !!note.due_date
        )
        .sort((a, b) =>
          (a.due_date ?? '').localeCompare(
            b.due_date ?? ''
          )
        )
        .slice(0, 6)
    );

  ngOnInit(): void {
    void Promise.all([
      this.loadUser(),
      this.loadStudentCount(),
      this.loadTodaySchedule(),
      this.loadPaymentSummary(),
      this.loadAcademicAttention(),
      this.loadRecentPayments(),
    ]);
  }

  private async loadUser(): Promise<void> {
    const {
      data: { user },
    } = await this.supabaseService.getUser();

    const fullName = user?.user_metadata?.['full_name'];

    this.displayName.set(
      fullName || user?.email?.split('@')[0] || 'Administrator'
    );
  }

  private async loadStudentCount(): Promise<void> {
    try {
      const count =
        await this.studentService.getActiveStudentCount();

      this.metrics.update((metrics) =>
        metrics.map((metric) =>
          metric.label === 'Total students'
            ? {
              ...metric,
              value: count.toString(),
            }
            : metric
        )
      );
    } catch (error) {
      console.error(
        'Unable to load student count:',
        error
      );
    }
  }

  private async loadTodaySchedule(): Promise<void> {
    this.scheduleLoading.set(true);

    try {
      const date = this.toDateKey(new Date());

      const schedules =
        await this.scheduleService
          .getSchedulesForDate(date);

      const activeSchedules = schedules.filter(
        (schedule) =>
          schedule.status !== 'cancelled'
      );

      this.todaySchedules.set(activeSchedules);

      this.metrics.update((metrics) =>
        metrics.map((metric) =>
          metric.label === "Today's classes"
            ? {
              ...metric,
              value:
                activeSchedules.length.toString(),
            }
            : metric
        )
      );
    } catch (error) {
      console.error(
        'Unable to load today schedule:',
        error
      );
    } finally {
      this.scheduleLoading.set(false);
    }
  }

  formatScheduleTime(time: string): string {
    const [hours, minutes] =
      time.split(':').map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    ).format(date);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private async loadPaymentSummary(): Promise<void> {
    try {
      const summary =
        await this.paymentService.getCurrentMonthSummary();

      this.metrics.update((metrics) =>
        metrics.map((metric) => {
          if (metric.label === 'Pending fees') {
            return {
              ...metric,
              value: this.formatCurrency(
                summary.pendingAmount
              ),
            };
          }

          if (metric.label === 'Collected this month') {
            return {
              ...metric,
              value: this.formatCurrency(
                summary.collectedAmount
              ),
            };
          }

          return metric;
        })
      );
    } catch (error) {
      console.error(
        'Unable to load payment summary:',
        error
      );
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private async loadAcademicAttention():
    Promise<void> {
    this.academicLoading.set(true);

    try {
      const notes =
        await this.noteService
          .getDashboardAcademicNotes();

      this.academicNotes.set(notes);
    } catch (error) {
      console.error(
        'Unable to load academic attention:',
        error
      );
    } finally {
      this.academicLoading.set(false);
    }
  }

  noteTypeLabel(
    type: NoteType
  ): string {
    const labels:
      Record<NoteType, string> = {
      general: 'General Note',
      student_note: 'Student Note',
      class_note: 'Class Note',
      homework: 'Homework',
      follow_up: 'Follow-up',
    };

    return labels[type];
  }

  noteTypeIcon(
    type: NoteType
  ): string {
    const icons:
      Record<NoteType, string> = {
      general: 'description',
      student_note: 'person',
      class_note: 'school',
      homework: 'assignment',
      follow_up: 'notifications',
    };

    return icons[type];
  }

  isAcademicNoteOverdue(
    note: Note
  ): boolean {
    return (
      note.status === 'pending' &&
      !!note.due_date &&
      note.due_date < this.todayKey
    );
  }

  formatTaskDueDate(
    dueDate: string | null
  ): string {
    if (!dueDate) {
      return '';
    }

    if (dueDate === this.todayKey) {
      return 'Today';
    }

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const tomorrowKey =
      this.toDateKey(tomorrow);

    if (dueDate === tomorrowKey) {
      return 'Tomorrow';
    }

    const date =
      new Date(`${dueDate}T00:00:00`);

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
      }
    ).format(date);
  }

  private getLocalDateString(): string {
    return this.toDateKey(
      new Date()
    );
  }

  private async loadRecentPayments():
    Promise<void> {
    this.paymentsLoading.set(true);

    try {
      this.recentPayments.set(
        await this.paymentService
          .getRecentPayments(5)
      );
    } catch (error) {
      console.error(
        'Unable to load recent payments:',
        error
      );
    } finally {
      this.paymentsLoading.set(false);
    }
  }

  paymentMethodLabel(
    mode: Payment['payment_mode']
  ): string {
    switch (mode) {
      case 'upi':
        return 'UPI';

      case 'cash':
        return 'Cash';
    }
  }

  paymentMethodIcon(
    mode: Payment['payment_mode']
  ): string {
    switch (mode) {
      case 'upi':
        return 'qr_code';

      case 'cash':
        return 'payments';
    }
  }
}
