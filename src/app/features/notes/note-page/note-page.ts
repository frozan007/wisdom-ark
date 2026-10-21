import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Note, NoteStatus, NoteType } from '../models/note';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoteService } from '../services/note';

type TypeFilter =
  | 'all'
  | NoteType;

type StatusFilter =
  | 'all'
  | NoteStatus
  | 'due_today'
  | 'overdue';

@Component({
  selector: 'app-note-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './note-page.html',
  styleUrl: './note-page.scss',
})
export class NotePage implements OnInit {
  private readonly noteService = inject(NoteService);

  readonly notes = signal<Note[]>([]);

  readonly loading = signal(true);

  readonly errorMessage = signal('');

  readonly searchTerm = signal('');

  readonly selectedType = signal<TypeFilter>('all');

  readonly selectedStatus = signal<StatusFilter>('all');

  readonly today = this.getLocalDateString();

  private readonly route = inject(ActivatedRoute);

  readonly filteredNotes =
    computed(() => {
      const search =
        this.searchTerm()
          .trim()
          .toLowerCase();

      const type =
        this.selectedType();

      const status =
        this.selectedStatus();

      return this.notes().filter(
        (note) => {
          const matchesSearch =
            !search ||
            note.title
              .toLowerCase()
              .includes(search) ||
            note.content
              ?.toLowerCase()
              .includes(search) ||
            note.students
              ?.student_name
              ?.toLowerCase()
              .includes(search);

          const matchesType =
            type === 'all' ||
            note.note_type === type;

          let matchesStatus = true;

          if (status === 'pending') {
            matchesStatus =
              note.status === 'pending';
          }

          if (status === 'completed') {
            matchesStatus =
              note.status === 'completed';
          }

          if (status === 'due_today') {
            matchesStatus =
              note.status === 'pending' &&
              note.due_date === this.today;
          }

          if (status === 'overdue') {
            matchesStatus =
              this.isOverdue(note);
          }

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus
          );
        }
      );
    });

  readonly pendingCount =
    computed(
      () =>
        this.notes().filter(
          (note) =>
            note.status === 'pending'
        ).length
    );

  readonly dueTodayCount =
    computed(
      () =>
        this.notes().filter(
          (note) =>
            note.status === 'pending' &&
            note.due_date === this.today
        ).length
    );

  readonly overdueCount =
    computed(
      () =>
        this.notes().filter(
          (note) =>
            this.isOverdue(note)
        ).length
    );

  readonly completedCount =
    computed(
      () =>
        this.notes().filter(
          (note) =>
            note.status === 'completed'
        ).length
    );

  ngOnInit(): void {
    this.applyQueryFilters();
    void this.loadNotes();
  }

  async loadNotes(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const notes =
        await this.noteService.getNotes();

      this.notes.set(notes);
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleComplete(
    note: Note
  ): Promise<void> {
    try {
      const status: NoteStatus =
        note.status === 'completed'
          ? 'pending'
          : 'completed';

      await this.noteService.setStatus(
        note.id,
        status
      );

      await this.loadNotes();
    } catch (error) {
      this.setError(error);
    }
  }

  showAll(): void {
    this.selectedType.set('all');
    this.selectedStatus.set('all');
  }

  showPending(): void {
    this.selectedStatus.set('pending');
  }

  showDueToday(): void {
    this.selectedType.set('all');
    this.selectedStatus.set(
      'due_today'
    );
  }

  showOverdue(): void {
    this.selectedStatus.set('overdue');
  }

  showCompleted(): void {
    this.selectedStatus.set(
      'completed'
    );
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('all');
    this.selectedStatus.set('all');
  }

  isOverdue(note: Note): boolean {
    return (
      note.status === 'pending' &&
      !!note.due_date &&
      note.due_date < this.today
    );
  }

  isDueToday(note: Note): boolean {
    return (
      note.status === 'pending' &&
      note.due_date === this.today
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
        : 'Unable to load notes.'
    );
  }

  private applyQueryFilters(): void {
    const filter =
      this.route.snapshot
        .queryParamMap
        .get('filter');

    const type =
      this.route.snapshot
        .queryParamMap
        .get('type');

    if (
      filter === 'overdue' ||
      filter === 'due_today' ||
      filter === 'pending' ||
      filter === 'completed'
    ) {
      this.selectedStatus.set(
        filter
      );
    }

    if (
      type === 'general' ||
      type === 'student_note' ||
      type === 'class_note' ||
      type === 'homework' ||
      type === 'follow_up'
    ) {
      this.selectedType.set(
        type
      );
    }
  }
}
