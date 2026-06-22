-- Run once in Supabase SQL Editor (converts existing data + updates constraints)

-- 1. subjects: type and days
alter table public.subjects drop constraint if exists subjects_type_check;

update public.subjects set type = '必修' where type = 'compulsory';
update public.subjects set type = '選択' where type = 'elective';

alter table public.subjects
    add constraint subjects_type_check
    check (type = any (array['必修'::text, '選択'::text]));

update public.subjects
set days = (
    select coalesce(array_agg(
        case d
            when 'monday' then '月曜'
            when 'tuesday' then '火曜'
            when 'wednesday' then '水曜'
            when 'thursday' then '木曜'
            when 'friday' then '金曜'
            when 'saturday' then '土曜'
            when 'sunday' then '日曜'
            else d
        end
    ), '{}'::text[])
    from unnest(days) as d
)
where days is not null and array_length(days, 1) > 0;

-- 2. attendance: status
alter table public.attendance drop constraint if exists attendance_status_check;

update public.attendance set status = '出席' where status = 'present';
update public.attendance set status = '遅刻' where status = 'late';
update public.attendance set status = '欠席' where status = 'absent';
update public.attendance set status = '休講' where status = 'skipped';

alter table public.attendance
    add constraint attendance_status_check
    check (status = any (array['出席'::text, '遅刻'::text, '欠席'::text, '休講'::text]));
