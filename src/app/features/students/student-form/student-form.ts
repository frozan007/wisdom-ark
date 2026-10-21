import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudentService } from '../services/student';
import { StudentFormValue, StudentGender } from '../models/student';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './student-form.html',
  styleUrl: './student-form.scss',
})
export class StudentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentService = inject(StudentService);

  readonly loading = signal(false);
  readonly loadingStudent = signal(false);
  readonly errorMessage = signal('');
  readonly imagePreview = signal<string | null>(null);
  readonly editMode = signal(false);

  private studentId: string | null = null;
  private selectedImage: File | null = null;

  readonly today = new Date().toISOString().split('T')[0];

  readonly studentForm = this.formBuilder.nonNullable.group({
    student_name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    ],

    date_of_birth: [''],
    gender: [''],

    school_name: ['', Validators.maxLength(150)],
    class_name: [
      '',
      [
        Validators.required,
        Validators.maxLength(50),
      ],
    ],

    subjectsText: ['', Validators.maxLength(300)],

    parent_name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    ],

    primary_phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ],
    ],

    alternative_phone: [
      '',
      Validators.pattern(/^$|^[0-9]{10}$/),
    ],

    email: [
      '',
      Validators.email,
    ],

    address: ['', Validators.maxLength(500)],

    joining_date: [
      this.today,
      Validators.required,
    ],

    monthly_fee: [
      0,
      [
        Validators.required,
        Validators.min(0),
      ],
    ],

    payment_due_day: [
      null as number | null,
      [
        Validators.min(1),
        Validators.max(31),
      ],
    ],

    status: ['active'],

    notes: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id');
    this.editMode.set(Boolean(this.studentId));

    if (this.studentId) {
      void this.loadStudent(this.studentId);
    }
  }

  onImageSelected(event: Event): void {
    this.errorMessage.set('');

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set(
        'Profile photo must be a JPEG, PNG, or WebP image.'
      );

      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set(
        'Profile photo must not be larger than 5 MB.'
      );

      input.value = '';
      return;
    }

    this.selectedImage = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  removeSelectedImage(fileInput: HTMLInputElement): void {
    this.selectedImage = null;
    this.imagePreview.set(null);
    fileInput.value = '';
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    this.loading.set(true);

    try {
      const rawValue = this.studentForm.getRawValue();

      const formValue: StudentFormValue = {
        student_name: rawValue.student_name,
        date_of_birth: rawValue.date_of_birth || null,
        gender:
          (rawValue.gender as StudentGender) || null,

        school_name: rawValue.school_name || null,
        class_name: rawValue.class_name,

        subjects: rawValue.subjectsText
          .split(',')
          .map((subject) => subject.trim())
          .filter(Boolean),

        parent_name: rawValue.parent_name,
        primary_phone: rawValue.primary_phone,
        alternative_phone:
          rawValue.alternative_phone || null,

        email: rawValue.email || null,
        address: rawValue.address || null,

        joining_date: rawValue.joining_date,
        monthly_fee: Number(rawValue.monthly_fee),

        payment_due_day:
          rawValue.payment_due_day === null ||
          rawValue.payment_due_day === undefined
            ? null
            : Number(rawValue.payment_due_day),

        status:
          rawValue.status === 'inactive'
            ? 'inactive'
            : 'active',

        notes: rawValue.notes || null,
      };

      if (this.editMode() && this.studentId) {
        await this.studentService.updateStudent(
          this.studentId,
          formValue,
          this.selectedImage
        );

        await this.router.navigate([
          '/app/students',
          this.studentId,
        ]);

        return;
      }

      const student =
        await this.studentService.createStudent(
          formValue,
          this.selectedImage
        );

      await this.router.navigate([
        '/app/students',
        student.id,
      ]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to save the student.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  hasError(
    controlName: keyof typeof this.studentForm.controls,
    errorName: string
  ): boolean {
    const control = this.studentForm.controls[controlName];

    return control.touched && control.hasError(errorName);
  }

  private async loadStudent(id: string): Promise<void> {
    this.loadingStudent.set(true);
    this.errorMessage.set('');

    try {
      const student = await this.studentService.getStudent(id);

      this.studentForm.patchValue({
        student_name: student.student_name,
        date_of_birth: student.date_of_birth ?? '',
        gender: student.gender ?? '',

        school_name: student.school_name ?? '',
        class_name: student.class_name,
        subjectsText: student.subjects.join(', '),

        parent_name: student.parent_name,
        primary_phone: student.primary_phone,
        alternative_phone:
          student.alternative_phone ?? '',

        email: student.email ?? '',
        address: student.address ?? '',

        joining_date: student.joining_date,
        monthly_fee: Number(student.monthly_fee),
        payment_due_day: student.payment_due_day,

        status:
          student.status === 'inactive'
            ? 'inactive'
            : 'active',

        notes: student.notes ?? '',
      });

      this.imagePreview.set(
        student.profile_image_url ?? null
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load the student.'
      );
    } finally {
      this.loadingStudent.set(false);
    }
  }

  private scrollToFirstInvalidField(): void {
    setTimeout(() => {
      const invalidField =
        document.querySelector<HTMLElement>(
          '.student-form .ng-invalid'
        );

      invalidField?.focus();
      invalidField?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
}
