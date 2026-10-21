import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase';
import { Student, StudentFormValue, StudentStatus } from '../models/student';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly tableName = 'students';
  private readonly bucketName = 'student-profiles';

  async getStudents(options?: {
    search?: string;
    status?: StudentStatus | 'all';
  }): Promise<Student[]> {
    let query = this.supabaseService.client
      .from(this.tableName)
      .select('*')
      .order('student_name', { ascending: true });

    const status = options?.status ?? 'active';

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const search = options?.search?.trim();

    if (search) {
      const safeSearch = search.replace(/[%_,()]/g, '');

      query = query.or(
        [
          `student_name.ilike.%${safeSearch}%`,
          `parent_name.ilike.%${safeSearch}%`,
          `primary_phone.ilike.%${safeSearch}%`,
          `class_name.ilike.%${safeSearch}%`,
          `school_name.ilike.%${safeSearch}%`,
        ].join(',')
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return this.attachSignedUrls((data ?? []) as Student[]);
  }

  async getStudent(id: string): Promise<Student> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const [student] = await this.attachSignedUrls([data as Student]);

    return student;
  }

  async createStudent(
    formValue: StudentFormValue,
    profileImage?: File | null
  ): Promise<Student> {
    const {
      data: { user },
      error: userError,
    } = await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error('You must be logged in to add a student.');
    }

    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .insert({
        ...this.cleanFormValue(formValue),
        owner_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let student = data as Student;

    if (profileImage) {
      const imagePath = await this.uploadProfileImage(
        user.id,
        student.id,
        profileImage
      );

      const { data: updatedStudent, error: updateError } =
        await this.supabaseService.client
          .from(this.tableName)
          .update({
            profile_image_path: imagePath,
          })
          .eq('id', student.id)
          .select('*')
          .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      student = updatedStudent as Student;
    }

    return student;
  }

  async updateStudent(
    id: string,
    formValue: StudentFormValue,
    profileImage?: File | null
  ): Promise<Student> {
    let profileImagePath: string | undefined;

    if (profileImage) {
      const {
        data: { user },
        error: userError,
      } = await this.supabaseService.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in.');
      }

      profileImagePath = await this.uploadProfileImage(
        user.id,
        id,
        profileImage
      );
    }

    const updateValue = {
      ...this.cleanFormValue(formValue),
      ...(profileImagePath
        ? { profile_image_path: profileImagePath }
        : {}),
    };

    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .update(updateValue)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Student;
  }

  async archiveStudent(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async restoreStudent(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .update({
        status: 'active',
        archived_at: null,
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteStudent(
    id: string,
    profileImagePath?: string | null
  ): Promise<void> {
    if (profileImagePath) {
      const { error: storageError } =
        await this.supabaseService.client.storage
          .from(this.bucketName)
          .remove([profileImagePath]);

      if (storageError) {
        console.error(
          'Profile image could not be deleted:',
          storageError.message
        );
      }
    }

    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  private async uploadProfileImage(
    userId: string,
    studentId: string,
    file: File
  ): Promise<string> {
    this.validateProfileImage(file);

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const path =
      `${userId}/${studentId}/profile-${Date.now()}.${extension}`;

    const { error } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return path;
  }

  private async attachSignedUrls(
    students: Student[]
  ): Promise<Student[]> {
    return Promise.all(
      students.map(async (student) => {
        if (!student.profile_image_path) {
          return {
            ...student,
            profile_image_url: null,
          };
        }

        const { data, error } =
          await this.supabaseService.client.storage
            .from(this.bucketName)
            .createSignedUrl(student.profile_image_path, 3600);

        return {
          ...student,
          profile_image_url:
            error ? null : data.signedUrl,
        };
      })
    );
  }

  private cleanFormValue(
    value: StudentFormValue
  ): StudentFormValue {
    return {
      ...value,
      student_name: value.student_name.trim(),
      school_name: value.school_name?.trim() || null,
      class_name: value.class_name.trim(),
      subjects: value.subjects
        .map((subject) => subject.trim())
        .filter(Boolean),
      parent_name: value.parent_name.trim(),
      primary_phone: value.primary_phone.trim(),
      alternative_phone:
        value.alternative_phone?.trim() || null,
      email: value.email?.trim().toLowerCase() || null,
      address: value.address?.trim() || null,
      notes: value.notes?.trim() || null,
    };
  }

  private validateProfileImage(file: File): void {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        'Profile photo must be a JPEG, PNG, or WebP image.'
      );
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      throw new Error(
        'Profile photo must not be larger than 5 MB.'
      );
    }
  }

  async getActiveStudentCount(): Promise<number> {
    const { count, error } = await this.supabaseService.client
      .from(this.tableName)
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'active');

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async getActiveStudentsForSelection(): Promise<Student[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        id,
        owner_id,
        student_name,
        profile_image_path,
        date_of_birth,
        gender,
        school_name,
        class_name,
        subjects,
        parent_name,
        primary_phone,
        alternative_phone,
        email,
        address,
        joining_date,
        monthly_fee,
        payment_due_day,
        status,
        notes,
        archived_at,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
      .order('student_name', {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Student[];
  }
}
