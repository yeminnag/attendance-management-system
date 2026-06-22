-- Migrate attendance.status to Japanese labels

alter table public.attendance drop constraint if exists attendance_status_check;

update public.attendance set status = '出席' where status = 'present';
update public.attendance set status = '遅刻' where status = 'late';
update public.attendance set status = '欠席' where status = 'absent';
update public.attendance set status = '休講' where status = 'skipped';

alter table public.attendance
    add constraint attendance_status_check
    check (status = any (array['出席'::text, '遅刻'::text, '欠席'::text, '休講'::text]));
