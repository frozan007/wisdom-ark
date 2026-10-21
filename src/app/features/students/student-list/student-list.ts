import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { StudentService } from '../services/student';
import { Student, StudentStatus } from '../models/student';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './student-list.html',
  styleUrl: './student-list.scss',
})
export class StudentList implements OnInit {
  private readonly studentService = inject(StudentService);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  private readonly dialog = inject(MatDialog);
  
  searchText = '';
  selectedStatus: StudentStatus | 'all' = 'active';

  ngOnInit(): void {
    void this.loadStudents();
  }

  async search(): Promise<void> {
    await this.loadStudents();
  }

  async statusChanged(): Promise<void> {
    await this.loadStudents();
  }

  async archive(student: Student): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Archive student?',
      message:
        `${student.student_name} will be removed from the active ` +
        'student list, but their information will be preserved.',
      confirmText: 'Archive',
      icon: 'archive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.studentService.archiveStudent(student.id);
      await this.loadStudents();
    } catch (error) {
      this.setError(error);
    }
  }

  async restore(student: Student): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Restore student?',
      message:
        `${student.student_name} will be returned to the active ` +
        'student list.',
      confirmText: 'Restore',
      icon: 'restore',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.studentService.restoreStudent(student.id);
      await this.loadStudents();
    } catch (error) {
      this.setError(error);
    }
  }

  async permanentlyDelete(student: Student): Promise<void> {
    const confirmed = await this.openConfirmation({
      title: 'Permanently delete student?',
      message:
        `${student.student_name} will be permanently deleted. ` +
        'This action cannot be undone.',
      confirmText: 'Delete permanently',
      icon: 'delete_forever',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.studentService.deleteStudent(
        student.id,
        student.profile_image_path
      );

      await this.loadStudents();
    } catch (error) {
      this.setError(error);
    }
  }

  private async loadStudents(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const students = await this.studentService.getStudents({
        search: this.searchText,
        status: this.selectedStatus,
      });

      this.students.set(students);
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
        : 'Something went wrong.'
    );
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
}
