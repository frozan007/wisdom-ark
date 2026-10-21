import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScheduleService } from '../services/schedule';
import { StudentService } from '../../students/services/student';
import { Student } from '../../students/models/student';
import { ScheduleClassType, ScheduleFormValue, ScheduleStatus } from '../models/schedule';

@Component({
  selector: 'app-schedule-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './schedule-form.html',
  styleUrl: './schedule-form.scss',
})
export class ScheduleForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly scheduleService = inject(ScheduleService);
  private readonly studentService = inject(StudentService);

  readonly students = signal<Student[]>([]);
  readonly editMode = signal(false);
  readonly loading = signal(false);
  readonly loadingData = signal(true);
  readonly errorMessage = signal('');

  private scheduleId: string | null = null;

  readonly today = this.toDateKey(new Date());

  readonly scheduleForm = this.formBuilder.nonNullable.group({
    student_id: [''],

    title: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],

    subject: ['', Validators.maxLength(100)],

    class_date: [
      this.today,
      Validators.required,
    ],

    start_time: [
      '16:00',
      Validators.required,
    ],

    end_time: [
      '17:00',
      Validators.required,
    ],

    class_type: ['individual'],

    status: ['scheduled'],

    location: ['', Validators.maxLength(200)],

    description: ['', Validators.maxLength(1000)],
  });

  ngOnInit(): void {
    this.scheduleId =
      this.route.snapshot.paramMap.get('id');

    this.editMode.set(Boolean(this.scheduleId));

    void this.initialize();
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const raw = this.scheduleForm.getRawValue();

    if (raw.end_time <= raw.start_time) {
      this.errorMessage.set(
        'End time must be later than start time.'
      );
      return;
    }

    this.loading.set(true);

    try {
      const value: ScheduleFormValue = {
        student_id: raw.student_id || null,
        title: raw.title,

        subject: raw.subject || null,

        class_date: raw.class_date,
        start_time: raw.start_time,
        end_time: raw.end_time,

        class_type:
          raw.class_type as ScheduleClassType,

        status:
          raw.status as ScheduleStatus,

        location: raw.location || null,

        description:
          raw.description || null,
      };

      if (this.editMode() && this.scheduleId) {
        await this.scheduleService.updateSchedule(
          this.scheduleId,
          value
        );
      } else {
        await this.scheduleService.createSchedule(value);
      }

      await this.router.navigate(['/app/schedule']);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to save the class.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  hasError(
    controlName: keyof typeof this.scheduleForm.controls,
    errorName: string
  ): boolean {
    const control =
      this.scheduleForm.controls[controlName];

    return (
      control.touched &&
      control.hasError(errorName)
    );
  }

  onStudentChanged(): void {
    const studentId =
      this.scheduleForm.controls.student_id.value;

    if (!studentId) {
      return;
    }

    const student = this.students().find(
      (item) => item.id === studentId
    );

    if (!student) {
      return;
    }

    if (!this.scheduleForm.controls.title.value.trim()) {
      this.scheduleForm.controls.title.setValue(
        `${student.student_name} - Tuition Class`
      );
    }

    if (
      !this.scheduleForm.controls.subject.value.trim() &&
      student.subjects.length === 1
    ) {
      this.scheduleForm.controls.subject.setValue(
        student.subjects[0]
      );
    }
  }

  private async initialize(): Promise<void> {
    this.loadingData.set(true);
    this.errorMessage.set('');

    try {
      const students =
        await this.studentService
          .getActiveStudentsForSelection();

      this.students.set(students);

      if (this.scheduleId) {
        await this.loadSchedule(this.scheduleId);
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load form data.'
      );
    } finally {
      this.loadingData.set(false);
    }
  }

  private async loadSchedule(
    id: string
  ): Promise<void> {
    const schedule =
      await this.scheduleService.getSchedule(id);

    this.scheduleForm.patchValue({
      student_id: schedule.student_id ?? '',
      title: schedule.title,
      subject: schedule.subject ?? '',

      class_date: schedule.class_date,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),

      class_type: schedule.class_type,
      status: schedule.status,

      location: schedule.location ?? '',
      description: schedule.description ?? '',
    });
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
}
