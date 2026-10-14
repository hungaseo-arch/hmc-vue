-- ============================================================================
-- T23 — 회원별 접속 추적 (2026-10 요청)
--
-- 접속 기록 화면(/admin/audit-log)은 "무슨 일이 있었나" 를 시간순으로 본다.
-- 이 함수는 거꾸로 "이 사람은 언제 들어왔나" 를 본다. 교인 한 명당 한 줄:
-- 기간 내 로그인 수·이용 일수·거부 수, 그리고 기간과 무관한 마지막 로그인·
-- 마지막 활동 시각.
--
-- T8·T19 의 audit_summary 와 같은 원칙을 따른다.
--   · security invoker - access_audit_log·profiles 의 RLS 를 그대로 받는다.
--   · 등급 검사는 3(슈퍼관리자). 권한없음과 0건을 구분해 안내하려고 한 번 더 본다.
--   · 읽기 전용. 기록을 고치거나 지우는 길은 만들지 않는다.
-- 선행: T19(감사 로그 슈퍼관리자 전용).
-- ============================================================================

create or replace function public.member_access_overview(
  p_from timestamptz,
  p_to   timestamptz
)
returns table (
  id             uuid,
  name           text,
  "position"     text,
  member_status  text,
  access_level   smallint,
  joined_at      timestamptz,
  logins         bigint,
  events         bigint,
  denied         bigint,
  active_days    bigint,
  last_login_at  timestamptz,
  last_seen_at   timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if public.current_access_level() < 3 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_to <= p_from then
    raise exception '기간이 올바르지 않습니다.' using errcode = '22007';
  end if;

  -- 기간 집계와 전체 집계를 각각 한 번씩만 훑는다. 사람마다 하위 질의를
  -- 돌리면 교인 수만큼 같은 인덱스를 다시 탄다.
  return query
  with period as (
    select l.user_id,
           count(*) filter (where l.event_type = 'login')         as logins,
           count(*)                                               as events,
           count(*) filter (where l.event_type = 'access_denied') as denied,
           -- 이용 일수는 자카르타 날짜로 센다(audit_summary 의 by_day 와 같은 기준).
           count(distinct (l.occurred_at at time zone 'Asia/Jakarta')::date) as active_days
      from public.access_audit_log l
     where l.occurred_at >= p_from
       and l.occurred_at <  p_to
       and l.user_id is not null
     group by l.user_id
  ),
  ever as (
    -- 보존 기간(12개월) 안의 전체. "마지막으로 본 때" 는 조회 기간과 무관해야
    -- 오래 안 들어온 분을 알아볼 수 있다.
    select l.user_id,
           max(l.occurred_at) filter (where l.event_type = 'login') as last_login_at,
           max(l.occurred_at)                                       as last_seen_at
      from public.access_audit_log l
     where l.user_id is not null
     group by l.user_id
  )
  select p.id,
         p.name,
         p.position,
         p.member_status,
         p.access_level,
         p.created_at,
         coalesce(pe.logins, 0),
         coalesce(pe.events, 0),
         coalesce(pe.denied, 0),
         coalesce(pe.active_days, 0),
         ev.last_login_at,
         ev.last_seen_at
    from public.profiles p
    left join period pe on pe.user_id = p.id
    left join ever   ev on ev.user_id = p.id
   -- 가입 신청만 하고 반려된 분은 추적 대상이 아니다.
   where p.member_status <> 'rejected';
end;
$$;

revoke all on function public.member_access_overview(timestamptz, timestamptz) from public, anon;
grant execute on function public.member_access_overview(timestamptz, timestamptz) to authenticated;

comment on function public.member_access_overview(timestamptz, timestamptz) is
  '회원별 접속 요약. 읽기 전용, 슈퍼관리자(3등급)만. RLS 를 그대로 받도록 security invoker.';
