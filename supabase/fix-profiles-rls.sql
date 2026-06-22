-- Run once in Supabase → SQL Editor
-- Creates profile trigger, helper functions, RLS policies, and class_sessions unique key.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.has_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
  );
$$;

create or replace function public.teaches_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.teacher_subjects
      where teacher_id = auth.uid()
        and subject_id = p_subject_id
    );
$$;

create or replace function public.can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.student_subjects ss
      join public.teacher_subjects ts on ts.subject_id = ss.subject_id
      where ss.student_id = p_student_id
        and ts.teacher_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Auto-create profile when a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    new.raw_user_meta_data->>'username'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        username = excluded.username;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Constraints
-- ---------------------------------------------------------------------------

create unique index if not exists class_sessions_subject_date_key
  on public.class_sessions (subject_id, date);

-- ---------------------------------------------------------------------------
-- 4. Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.student_subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.class_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- 5. profiles
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. subjects
-- ---------------------------------------------------------------------------

drop policy if exists "subjects_select" on public.subjects;
create policy "subjects_select"
  on public.subjects for select
  to authenticated
  using (public.has_profile());

drop policy if exists "subjects_insert" on public.subjects;
create policy "subjects_insert"
  on public.subjects for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "subjects_update" on public.subjects;
create policy "subjects_update"
  on public.subjects for update
  to authenticated
  using (public.teaches_subject(id))
  with check (public.teaches_subject(id));

drop policy if exists "subjects_delete" on public.subjects;
create policy "subjects_delete"
  on public.subjects for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. students
-- ---------------------------------------------------------------------------

drop policy if exists "students_select" on public.students;
create policy "students_select"
  on public.students for select
  to authenticated
  using (public.has_profile());

drop policy if exists "students_insert" on public.students;
create policy "students_insert"
  on public.students for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "students_update" on public.students;
create policy "students_update"
  on public.students for update
  to authenticated
  using (public.can_manage_student(id))
  with check (public.can_manage_student(id));

drop policy if exists "students_delete" on public.students;
create policy "students_delete"
  on public.students for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. student_subjects
-- ---------------------------------------------------------------------------

drop policy if exists "student_subjects_select" on public.student_subjects;
create policy "student_subjects_select"
  on public.student_subjects for select
  to authenticated
  using (public.has_profile());

drop policy if exists "student_subjects_insert" on public.student_subjects;
create policy "student_subjects_insert"
  on public.student_subjects for insert
  to authenticated
  with check (public.is_admin() or public.teaches_subject(subject_id));

drop policy if exists "student_subjects_delete" on public.student_subjects;
create policy "student_subjects_delete"
  on public.student_subjects for delete
  to authenticated
  using (public.is_admin() or public.teaches_subject(subject_id));

-- ---------------------------------------------------------------------------
-- 9. attendance
-- ---------------------------------------------------------------------------

drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using (public.has_profile());

drop policy if exists "attendance_insert" on public.attendance;
create policy "attendance_insert"
  on public.attendance for insert
  to authenticated
  with check (public.teaches_subject(subject_id));

drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update"
  on public.attendance for update
  to authenticated
  using (public.teaches_subject(subject_id))
  with check (public.teaches_subject(subject_id));

-- ---------------------------------------------------------------------------
-- 10. teacher_subjects
-- ---------------------------------------------------------------------------

drop policy if exists "teacher_subjects_select" on public.teacher_subjects;
create policy "teacher_subjects_select"
  on public.teacher_subjects for select
  to authenticated
  using (public.is_admin() or teacher_id = auth.uid());

drop policy if exists "teacher_subjects_insert" on public.teacher_subjects;
create policy "teacher_subjects_insert"
  on public.teacher_subjects for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "teacher_subjects_delete" on public.teacher_subjects;
create policy "teacher_subjects_delete"
  on public.teacher_subjects for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 11. class_sessions
-- ---------------------------------------------------------------------------

drop policy if exists "class_sessions_select" on public.class_sessions;
create policy "class_sessions_select"
  on public.class_sessions for select
  to authenticated
  using (public.has_profile());

drop policy if exists "class_sessions_insert" on public.class_sessions;
create policy "class_sessions_insert"
  on public.class_sessions for insert
  to authenticated
  with check (public.teaches_subject(subject_id) and teacher_id = auth.uid());

drop policy if exists "class_sessions_update" on public.class_sessions;
create policy "class_sessions_update"
  on public.class_sessions for update
  to authenticated
  using (public.teaches_subject(subject_id))
  with check (public.teaches_subject(subject_id));
