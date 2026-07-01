-- Run once in Supabase → SQL Editor (after messages-setup.sql and student-portal-setup.sql)
-- Lets students see assigned teachers and teachers see their students in messaging.

drop policy if exists "teacher_subjects_select_enrolled" on public.teacher_subjects;
create policy "teacher_subjects_select_enrolled"
  on public.teacher_subjects for select
  to authenticated
  using (
    public.is_student()
    and public.student_enrolled_in_subject(subject_id)
  );

drop policy if exists "profiles_select_messaging" on public.profiles;
create policy "profiles_select_messaging"
  on public.profiles for select
  to authenticated
  using (
    public.can_message(auth.uid(), id)
    or public.can_message(id, auth.uid())
  );
