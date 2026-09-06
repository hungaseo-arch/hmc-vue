-- T12 — 교역자 연락처를 번들에서 걷어낸다.
--
-- src/data/index.ts 의 staffMembers 에 휴대폰·이메일이 하드코딩돼 있었다.
-- 화면에는 "승인 교인만" 이라는 주석이 달려 있었지만, 번들 JS 는 로그인
-- 여부와 무관하게 브라우저로 그대로 내려가므로 소스만 열어보면 누구나
-- 볼 수 있었다. RLS 는 행 단위만 가려서 한 테이블에 다 넣으면 막을 수
-- 없으므로, 공개 정보(이름·직함·사진)와 연락처를 테이블 자체로 나눈다.

create table public.staff (
  id bigint generated always as identity primary key,
  name text not null,
  role text not null,
  image text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.staff_contacts (
  staff_id bigint primary key references public.staff(id) on delete cascade,
  phone text,
  email text
);

alter table public.staff enable row level security;
alter table public.staff_contacts enable row level security;

-- 이름·직함·사진은 누구나 — 옛 페이지도 로그인 없이 보이던 정보다.
create policy "누구나 조회" on public.staff
  for select to anon, authenticated using (true);

create policy "관리자 관리" on public.staff
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 연락처는 승인된 교인만. current_access_level() 은 member_status='active' 인
-- 사람에게만 1 이상을 준다 (T1 참고) — 로그인만 한 대기 중 계정은 못 본다.
create policy "승인 교인 조회" on public.staff_contacts
  for select to authenticated
  using ((select public.current_access_level()) >= 1);

create policy "관리자 관리" on public.staff_contacts
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.staff to anon, authenticated;
grant insert, update, delete on public.staff to authenticated;
grant select, insert, update, delete on public.staff_contacts to authenticated;

-- 기존 하드코딩 데이터를 그대로 옮긴다.
insert into public.staff (name, role, image, sort_order) values
  ('고형돈', '담임목사', '/staff/ko-hyungdon.jpg', 0),
  ('강준원', '부목사', '/staff/kang-junwon.jpg', 1),
  ('현명해', '전도사', '/staff/hyun-myunghae.jpg', 2);

insert into public.staff_contacts (staff_id, phone, email)
select s.id, v.phone, v.email
from public.staff s
join (values
  ('고형돈', '0812-8983-1433', 'hdonko@gmail.com'),
  ('강준원', '0815-9955-126', 'hansung0810@gmail.com'),
  ('현명해', '0813-1956-4711', null)
) as v(name, phone, email) on v.name = s.name;
