-- Run once in Supabase → SQL Editor
-- Groups multi-period classes (e.g. グラフィック応用 一限目 + 二限目) for attendance rate calculation.

alter table public.subjects
  add column if not exists course_name text;

comment on column public.subjects.course_name is
  'Shared name for attendance grouping. Multiple 限目 rows with the same course_name count as one subject.';

-- Optional backfill for names ending in 一限目 / 二限目 / ニ限目 etc.
update public.subjects
set course_name = trim(regexp_replace(name, '[\s　]*(一|二|三|四|五|六|七|八|九|十|ニ)限目\s*$', ''))
where (course_name is null or course_name = '')
  and name ~ '(一|二|三|四|五|六|七|八|九|十|ニ)限目\s*$';
