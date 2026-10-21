import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NoteService } from '../services/note';
import { StudentService } from '../../students/services/student';
import { ScheduleService } from '../../schedule/services/schedule';
import { NoteFormValue, NoteType } from '../models/note';

@Component({
  selector: 'app-note-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './note-form.html',
  styleUrl: './note-form.scss',
})
export class NoteForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly noteService = inject(NoteService);

  private readonly studentService = inject(StudentService);

  private readonly scheduleService = inject(ScheduleService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly saving = signal(false);

  readonly errorMessage = signal('');

  readonly students = signal<any[]>([]);

  readonly schedules = signal<any[]>([]);

  readonly noteId = signal<string | null>(null);

  readonly isEditMode = signal(false);

  readonly form =
    this.formBuilder.nonNullable.group({
      note_type: [
        'student_note' as NoteType,
        Validators.required,
      ],

      student_id: [''],

      schedule_id: [''],

      title: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],

      content: [''],

      due_date: [''],

      status: [
        'pending' as
          'pending' | 'completed',
        Validators.required,
      ],
    });

  ngOnInit(): void {
    this.form.controls.note_type
      .valueChanges
      .subscribe(() => {
        this.updateDueDateValidation();
      });

    void this.initialize();
  }

  get requiresDueDate(): boolean {
    const type =
      this.form.controls.note_type.value;

    return (
      type === 'homework' ||
      type === 'follow_up'
    );
  }

  async save(): Promise<void> {
    this.updateDueDateValidation();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const raw =
        this.form.getRawValue();

      const value: NoteFormValue = {
        note_type:
          raw.note_type,

        student_id:
          raw.student_id || null,

        schedule_id:
          raw.schedule_id || null,

        title:
          raw.title,

        content:
          raw.content || null,

        due_date:
          raw.due_date || null,

        status:
          raw.status,
      };

      if (
        this.isEditMode() &&
        this.noteId()
      ) {
        await this.noteService.updateNote(
          this.noteId()!,
          value
        );
      } else {
        await this.noteService.createNote(
          value
        );
      }

      await this.router.navigate([
        '/app/notes',
      ]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to save note.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async initialize():
    Promise<void> {
    this.loading.set(true);

    try {
      const [
        students,
        schedules,
      ] = await Promise.all([
        this.studentService.getStudents(),
        this.scheduleService
          .getSchedulesForNoteSelection(),
      ]);

      this.students.set(
        students.filter(
          (student: any) =>
            student.status === 'active'
        )
      );

      this.schedules.set(schedules);

      const id =
        this.route.snapshot.paramMap.get(
          'id'
        );

      const studentId =
        this.route.snapshot.queryParamMap.get(
          'studentId'
        );

      if (id) {
        // EDIT MODE
        this.noteId.set(id);
        this.isEditMode.set(true);

        const note =
          await this.noteService.getNote(
            id
          );

        this.form.patchValue({
          note_type:
            note.note_type,

          student_id:
            note.student_id ?? '',

          schedule_id:
            note.schedule_id ?? '',

          title:
            note.title,

          content:
            note.content ?? '',

          due_date:
            note.due_date ?? '',

          status:
            note.status,
        });

      } else if (studentId) {
        // ADD NOTE FROM STUDENT PROFILE
        const studentExists =
          students.some(
            (student: any) =>
              student.id === studentId &&
              student.status === 'active'
          );

        if (studentExists) {
          this.form.patchValue({
            student_id: studentId,
          });
        }
      }

      this.updateDueDateValidation();

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load note form.'
      );

    } finally {
      this.loading.set(false);
    }
  }

  private updateDueDateValidation():
    void {
    const control =
      this.form.controls.due_date;

    if (this.requiresDueDate) {
      control.setValidators([
        Validators.required,
      ]);
    } else {
      control.clearValidators();
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }
}
