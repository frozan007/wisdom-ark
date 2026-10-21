import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NoteService } from '../services/note';
import { MatDialog } from '@angular/material/dialog';
import { Note, NoteType } from '../models/note';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-note-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './note-detail.html',
  styleUrl: './note-detail.scss',
})
export class NoteDetail implements OnInit {
  private readonly noteService = inject(NoteService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly dialog = inject(MatDialog);

  readonly note = signal<Note | null>(null);

  readonly loading = signal(true);

  readonly processing = signal(false);

  readonly errorMessage = signal('');

  ngOnInit(): void {
    void this.loadNote();
  }

  async toggleStatus(): Promise<void> {
    const note = this.note();

    if (!note || this.processing()) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const newStatus =
        note.status === 'completed'
          ? 'pending'
          : 'completed';

      await this.noteService.setStatus(
        note.id,
        newStatus
      );

      await this.loadNote(false);
    } catch (error) {
      this.setError(error);
    } finally {
      this.processing.set(false);
    }
  }

  deleteNote(): void {
    const note = this.note();

    if (!note) {
      return;
    }

    const dialogRef =
      this.dialog.open(
        ConfirmDialog,
        {
          width: '440px',
          maxWidth: '94vw',

          data: {
            title: 'Delete Note?',
            message:
              `Delete "${note.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
          },
        }
      );

    dialogRef
      .afterClosed()
      .subscribe(
        async (confirmed: boolean) => {
          if (!confirmed) {
            return;
          }

          this.processing.set(true);
          this.errorMessage.set('');

          try {
            await this.noteService.deleteNote(
              note.id
            );

            await this.router.navigate([
              '/app/notes',
            ]);
          } catch (error) {
            this.setError(error);
          } finally {
            this.processing.set(false);
          }
        }
      );
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

  isOverdue(note: Note): boolean {
    if (
      note.status !== 'pending' ||
      !note.due_date
    ) {
      return false;
    }

    return (
      note.due_date <
      this.getLocalDateString()
    );
  }

  isDueToday(note: Note): boolean {
    return (
      note.status === 'pending' &&
      note.due_date ===
      this.getLocalDateString()
    );
  }

  private async loadNote(
    showLoader = true
  ): Promise<void> {
    if (showLoader) {
      this.loading.set(true);
    }

    this.errorMessage.set('');

    try {
      const id =
        this.route.snapshot.paramMap.get(
          'id'
        );

      if (!id) {
        throw new Error(
          'Note ID is missing.'
        );
      }

      const note =
        await this.noteService.getNote(
          id
        );

      this.note.set(note);
    } catch (error) {
      this.setError(error);
    } finally {
      if (showLoader) {
        this.loading.set(false);
      }
    }
  }

  private getLocalDateString(): string {
    const date = new Date();

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

  private setError(
    error: unknown
  ): void {
    this.errorMessage.set(
      error instanceof Error
        ? error.message
        : 'Unable to load note.'
    );
  }
}
