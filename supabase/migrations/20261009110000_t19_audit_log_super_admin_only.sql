-- ============================================================================
-- T19 — 접속 기록(감사 로그)을 슈퍼관리자(access_level 3)만 보도록 (2026-10 요청)
--
-- 지금까지는 관리자(2등급)도 볼 수 있었다. 로그 테이블의 조회 정책과 요약 함수의
-- 등급 검사를 3 으로 올린다. 조회 뷰 v_access_audit_log 는 security_invoker 라
-- 이 정책을 그대로 받는다. 기록(log_event)·보존기간 정리는 그대로다.
-- 선행: T18(슈퍼관리자 등급·is_super_admin).
-- ============================================================================

alter policy "관리자만 감사로그 조회" on public.access_audit_log
  using ((select public.current_access_level()) >= 3);

-- 요약 함수: 등급 검사를 3 으로(T8 과 같은 본문, 검사 한 줄만 다르다).
create or replace function public.audit_summary(
  p_from timestamptz,
  p_to   timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if public.current_access_level() < 3 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_to <= p_from then
    raise exception '기간이 올바르지 않습니다.' using errcode = '22007';
  end if;

  -- 기간이 아무리 넓어도 한 번의 집계로 끝난다. 인덱스는 occurred_at 에 있다.
  with base as (
    select l.user_id, l.event_type, l.resource, l.occurred_at
      from public.access_audit_log l
     where l.occurred_at >= p_from
       and l.occurred_at <  p_to
  )
  select jsonb_build_object(

    'total', (select count(*) from base),

    'users', (select count(distinct user_id) from base),

    -- 유형별 건수. 없는 유형은 키가 아예 없으므로 화면에서 0 으로 채운다.
    'by_event', coalesce((
      select jsonb_object_agg(event_type, c)
        from (select event_type, count(*) c from base group by 1) t
    ), '{}'::jsonb),

    -- 날짜는 자카르타 기준으로 자른다. UTC 로 자르면 저녁 예배 뒤의 접속이
    -- 다음 날로 넘어가 요일별 흐름이 어긋난다.
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'total', c, 'logins', li) order by d)
        from (
          select (occurred_at at time zone 'Asia/Jakarta')::date as d,
                 count(*) as c,
                 count(*) filter (where event_type = 'login') as li
            from base
           group by 1
        ) t
    ), '[]'::jsonb),

    -- 많이 쓴 사람 상위 20명.
    'top_users', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', user_id, 'name', nm, 'total', c, 'last_at', last_at
             ) order by c desc)
        from (
          select b.user_id,
                 coalesce(p.name, '(탈퇴 사용자)') as nm,
                 count(*) as c,
                 max(b.occurred_at) as last_at
            from base b
            left join public.profiles p on p.id = b.user_id
           group by b.user_id, p.name
           order by count(*) desc
           limit 20
        ) t
    ), '[]'::jsonb),

    -- 막힌 경로. 여기 같은 줄이 반복해서 쌓이면 둘 중 하나다.
    -- 권한 설정이 잘못됐거나, 옛 링크가 아직 돌아다니고 있거나.
    'denied', coalesce((
      select jsonb_agg(jsonb_build_object('resource', resource, 'total', c) order by c desc)
        from (
          select coalesce(resource, '(경로 없음)') as resource, count(*) as c
            from base
           where event_type = 'access_denied'
           group by 1
           order by count(*) desc
           limit 10
        ) t
    ), '[]'::jsonb),

    -- 승인은 됐는데 한 번도 들어오지 않은 분. 연락해서 도와드릴 대상이다.
    -- 이 항목만 기간과 무관하게 전체를 본다.
    'never_logged_in', (
      select count(*)
        from public.profiles p
       where p.member_status = 'active'
         and not exists (
           select 1 from public.access_audit_log l
            where l.user_id = p.id and l.event_type = 'login'
         )
    )

  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.audit_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.audit_summary(timestamptz, timestamptz) to authenticated;

comment on function public.audit_summary(timestamptz, timestamptz) is
  '감사 로그 기간 요약. 읽기 전용, 슈퍼관리자(3등급)만. RLS 를 그대로 받도록 security invoker.';
