-- Run once in Supabase → SQL Editor (after fix-profiles-rls.sql)
-- Removes duplicate attendance rows, then enforces one row per student + subject + date.

-- 1. Remove duplicates (keep the newest row by id)
with ranked as (
  select
    id,
    row_number() over (
      partition by student_id, subject_id, date
      order by id desc
    ) as rn
  from public.attendance
  where student_id is not null
    and subject_id is not null
)
delete from public.attendance a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- 2. Prevent future duplicates
create unique index if not exists attendance_student_subject_date_key
  on public.attendance (student_id, subject_id, date);
