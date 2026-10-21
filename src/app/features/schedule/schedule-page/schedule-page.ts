import { Component, inject, OnInit, signal } from '@angular/core';
import { Schedule } from '../models/schedule';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ScheduleService } from '../services/schedule';

type ScheduleView =
  | 'today'
  | 'calendar'
  | 'upcoming'
  | 'completed';

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  currentMonth: boolean;
  today: boolean;
  selected: boolean;
  schedules: Schedule[];
}

@Component({
  selector: 'app-schedule-page',
  imports: [
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.scss',
})
export class SchedulePage implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly dialog = inject(MatDialog);

  readonly activeView = signal<ScheduleView>('today');
  readonly schedules = signal<Schedule[]>([]);
  readonly calendarDays = signal<CalendarDay[]>([]);

  readonly loading = signal(true);
  readonly processingId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly todayKey = this.formatDateKey(new Date());
  readonly selectedDate = signal(this.todayKey);
  readonly calendarMonth = signal(this.startOfMonth(new Date()));

  ngOnInit(): void {
    void this.loadToday();
  }

  async showToday(): Promise<void> {
    this.activeView.set('today');
    this.selectedDate.set(this.todayKey);
    await this.loadToday();
  }

  async showUpcoming(): Promise<void> {
    this.activeView.set('upcoming');
    await this.loadUpcoming();
  }

  async showCompleted(): Promise<void> {
    this.activeView.set('completed');
    await this.loadCompleted();
  }

  async showCalendar(): Promise<void> {
    this.activeView.set('calendar');
    await this.loadCalendar();
  }

  async selectCalendarDate(day: CalendarDay): Promise<void> {
    this.selectedDate.set(day.dateKey);

    this.calendarDays.update((days) =>
      days.map((calendarDay) => ({
        ...calendarDay,
        selected: calendarDay.dateKey === day.dateKey,
      }))
    );

    await this.loadSelectedDate(day.dateKey);
  }

  async previousMonth(): Promise<void> {
    const current = this.calendarMonth();

    this.calendarMonth.set(
      new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        1
      )
    );

    await this.loadCalendar();
  }

  async nextMonth(): Promise<void> {
    const current = this.calendarMonth();

    this.calendarMonth.set(
      new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1
      )
    );

    await this.loadCalendar();
  }

  async markCompleted(schedule: Schedule): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Mark class as completed?',
      message:
        `${schedule.title} will move to the completed ` +
        'classes list.',
      confirmText: 'Mark completed',
      icon: 'task_alt',
    });

    if (!confirmed) {
      return;
    }

    await this.performAction(
      schedule.id,
      () => this.scheduleService.markCompleted(schedule.id)
    );
  }

  async cancel(schedule: Schedule): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Cancel this class?',
      message:
        `${schedule.title} will be marked as cancelled.`,
      confirmText: 'Cancel class',
      icon: 'event_busy',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    await this.performAction(
      schedule.id,
      () => this.scheduleService.cancelSchedule(schedule.id)
    );
  }

  async restore(schedule: Schedule): Promise<void> {
    await this.performAction(
      schedule.id,
      () => this.scheduleService.restoreSchedule(schedule.id)
    );
  }

  async permanentlyDelete(schedule: Schedule): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Delete class permanently?',
      message:
        `${schedule.title} will be permanently deleted.`,
      confirmText: 'Delete',
      icon: 'delete_forever',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    await this.performAction(
      schedule.id,
      () => this.scheduleService.deleteSchedule(schedule.id)
    );
  }

  formatTime(time: string): string {
    const [hourText, minuteText] = time.split(':');
    const date = new Date();

    date.setHours(
      Number(hourText),
      Number(minuteText),
      0,
      0
    );

    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private async loadToday(): Promise<void> {
    await this.loadSelectedDate(this.todayKey);
  }

  private async loadSelectedDate(date: string): Promise<void> {
    await this.loadData(() =>
      this.scheduleService.getSchedulesForDate(date)
    );
  }

  private async loadUpcoming(): Promise<void> {
    await this.loadData(() =>
      this.scheduleService.getUpcomingSchedules(this.todayKey)
    );
  }

  private async loadCompleted(): Promise<void> {
    await this.loadData(() =>
      this.scheduleService.getCompletedSchedules()
    );
  }

  private async loadCalendar(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const month = this.calendarMonth();
      const calendarStart = new Date(
        month.getFullYear(),
        month.getMonth(),
        1
      );

      const calendarEnd = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0
      );

      const schedules =
        await this.scheduleService.getSchedulesForMonth(
          this.formatDateKey(calendarStart),
          this.formatDateKey(calendarEnd)
        );

      this.calendarDays.set(
        this.buildCalendarDays(month, schedules)
      );

      await this.loadSelectedDate(this.selectedDate());
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private buildCalendarDays(
    month: Date,
    schedules: Schedule[]
  ): CalendarDay[] {
    const firstDay = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );

    const lastDay = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    );

    const leadingDays = firstDay.getDay();
    const totalCells = Math.ceil(
      (leadingDays + lastDay.getDate()) / 7
    ) * 7;

    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - leadingDays);

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const dateKey = this.formatDateKey(date);

      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        currentMonth:
          date.getMonth() === month.getMonth(),
        today: dateKey === this.todayKey,
        selected: dateKey === this.selectedDate(),
        schedules: schedules.filter(
          (schedule) => schedule.class_date === dateKey
        ),
      };
    });
  }

  private async performAction(
    scheduleId: string,
    action: () => Promise<void>
  ): Promise<void> {
    this.processingId.set(scheduleId);
    this.errorMessage.set('');

    try {
      await action();
      await this.reloadActiveView();
    } catch (error) {
      this.setError(error);
    } finally {
      this.processingId.set(null);
    }
  }

  private async reloadActiveView(): Promise<void> {
    switch (this.activeView()) {
      case 'calendar':
        await this.loadCalendar();
        break;

      case 'upcoming':
        await this.loadUpcoming();
        break;

      case 'completed':
        await this.loadCompleted();
        break;

      default:
        await this.loadToday();
    }
  }

  private async loadData(
    loader: () => Promise<Schedule[]>
  ): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.schedules.set(await loader());
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private openConfirmation(
    data: ConfirmDialogData
  ): Promise<boolean> {
    const reference = this.dialog.open<
      ConfirmDialog,
      ConfirmDialogData,
      boolean
    >(ConfirmDialog, {
      width: '430px',
      maxWidth: 'calc(100vw - 32px)',
      data,
    });

    return new Promise((resolve) => {
      reference.afterClosed().subscribe((result) => {
        resolve(result === true);
      });
    });
  }

  private startOfMonth(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private setError(error: unknown): void {
    this.errorMessage.set(
      error instanceof Error
        ? error.message
        : 'Unable to load the schedule.'
    );
  }
}
