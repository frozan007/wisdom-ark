import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudentService } from '../services/student';
import { Student } from '../models/student';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Note, NoteType } from '../../notes/models/note';
import { NoteService } from '../../notes/services/note';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.scss',
})
export class StudentProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly studentService = inject(StudentService);
  private readonly noteService = inject(NoteService);
  readonly studentNotes = signal<Note[]>([]);

  readonly student = signal<Student | null>(null);
  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly errorMessage = signal('');
  private studentId = '';

  readonly pendingHomework =
    computed(() =>
      this.studentNotes().filter(
        (note) =>
          note.note_type === 'homework' &&
          note.status === 'pending'
      )
    );

  readonly followUps =
    computed(() =>
      this.studentNotes().filter(
        (note) =>
          note.note_type === 'follow_up' &&
          note.status === 'pending'
      )
    );

  readonly overdueNotes =
    computed(() =>
      this.studentNotes().filter(
        (note) =>
          this.isNoteOverdue(note)
      )
    );

  readonly completedAcademicItems =
    computed(() =>
      this.studentNotes().filter(
        (note) =>
          note.status === 'completed' &&
          (
            note.note_type === 'homework' ||
            note.note_type === 'follow_up'
          )
      )
    );

  readonly recentAcademicNotes =
    computed(() =>
      this.studentNotes()
        .slice(0, 5)
    );

  readonly pendingAcademicItems = computed(() =>
    this.studentNotes().filter(
      note => note.status === 'pending'
    )
  );

  ngOnInit(): void {
    this.studentId =
      this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.studentId) {
      this.errorMessage.set('Student ID is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadStudent();
  }

  async archive(): Promise<void> {
    const student = this.student();

    if (!student) {
      return;
    }

    const confirmed = await this.openConfirmation({
      title: 'Archive student?',
      message:
        `${student.student_name} will be hidden from the active ` +
        'student list. Their records will remain available.',
      confirmText: 'Archive',
      icon: 'archive',
    });

    if (!confirmed) {
      return;
    }

    this.processing.set(true);

    try {
      await this.studentService.archiveStudent(student.id);
      await this.loadStudent();
    } catch (error) {
      this.setError(error);
    } finally {
      this.processing.set(false);
    }
  }

  async restore(): Promise<void> {
    const student = this.student();

    if (!student) {
      return;
    }

    const confirmed = await this.openConfirmation({
      title: 'Restore student?',
      message:
        `${student.student_name} will return to the active ` +
        'student list.',
      confirmText: 'Restore',
      icon: 'restore',
    });

    if (!confirmed) {
      return;
    }

    this.processing.set(true);

    try {
      await this.studentService.restoreStudent(student.id);
      await this.loadStudent();
    } catch (error) {
      this.setError(error);
    } finally {
      this.processing.set(false);
    }
  }

  async permanentlyDelete(): Promise<void> {
    const student = this.student();

    if (!student) {
      return;
    }

    const confirmed = await this.openConfirmation({
      title: 'Permanently delete student?',
      message:
        `${student.student_name} and their profile image will be ` +
        'permanently deleted. This action cannot be undone.',
      confirmText: 'Delete permanently',
      icon: 'delete_forever',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.processing.set(true);

    try {
      await this.studentService.deleteStudent(
        student.id,
        student.profile_image_path
      );

      await this.router.navigate(['/app/students']);
    } catch (error) {
      this.setError(error);
      this.processing.set(false);
    }
  }

  callStudent(): void {
    const phone = this.student()?.primary_phone;

    if (phone) {
      window.location.href = `tel:+91${phone}`;
    }
  }

  emailStudent(): void {
    const email = this.student()?.email;

    if (email) {
      window.location.href = `mailto:${email}`;
    }
  }

  private async loadStudent(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const [
        student,
        notes,
      ] = await Promise.all([
        this.studentService.getStudent(
          this.studentId
        ),

        this.noteService.getNotesByStudent(
          this.studentId
        ),
      ]);

      this.student.set(student);
      this.studentNotes.set(notes);

    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private openConfirmation(
    data: ConfirmDialogData
  ): Promise<boolean> {
    const dialogReference = this.dialog.open<
      ConfirmDialog,
      ConfirmDialogData,
      boolean
    >(ConfirmDialog, {
      width: '430px',
      maxWidth: 'calc(100vw - 32px)',
      data,
    });

    return new Promise((resolve) => {
      dialogReference.afterClosed().subscribe((result) => {
        resolve(result === true);
      });
    });
  }

  private setError(error: unknown): void {
    this.errorMessage.set(
      error instanceof Error
        ? error.message
        : 'Something went wrong.'
    );
  }

  async toggleNoteStatus(
    note: Note
  ): Promise<void> {
    try {
      const status =
        note.status === 'completed'
          ? 'pending'
          : 'completed';

      await this.noteService.setStatus(
        note.id,
        status
      );

      const student =
        this.student();

      if (!student) {
        return;
      }

      const notes =
        await this.noteService
          .getNotesByStudent(
            student.id
          );

      this.studentNotes.set(notes);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to update note.'
      );
    }
  }

  isNoteOverdue(note: Note): boolean {
    if (
      note.status === 'completed' ||
      !note.due_date
    ) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate =
      new Date(`${note.due_date}T00:00:00`);

    return dueDate < today;
  }

  noteTypeLabel(type: NoteType): string {
    switch (type) {
      case 'homework':
        return 'Homework';

      case 'class_note':
        return 'Class Note';

      case 'student_note':
        return 'Student Note';

      case 'follow_up':
        return 'Follow-up';

      default:
        return 'Note';
    }
  }

  noteTypeIcon(type: NoteType): string {
    switch (type) {
      case 'homework':
        return 'assignment';

      case 'class_note':
        return 'school';

      case 'student_note':
        return 'person';

      case 'follow_up':
        return 'notifications';

      default:
        return 'note';
    }
  }
  private getLocalDateString(): string {
    const date =
      new Date();

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
  
}
