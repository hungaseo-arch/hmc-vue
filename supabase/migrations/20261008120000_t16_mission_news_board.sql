-- ============================================================================
-- T16 — 선교소식을 교회소식과 같은 게시판으로 (2026-10 목사님 요청)
--
-- 선교소식은 지금까지 src/data/index.ts 에 박힌 정적 목록이었다. 교회소식과
-- 똑같이 "비공개 버킷(사진) + 내용 테이블" 구조로 바꾸고, 승인 교인(1등급)만
-- 읽고 관리자만 쓴다. 현지 정부가 볼 수 있어 공개하지 않는다.
--
-- 교회소식(church_news_content)과 다른 점: 처음부터 is_admin() 정책과
-- authenticated 전용 grant 로 만든다(T13 의 교훈). 컬럼은 같다.
-- ============================================================================

-- 1. 비공개 버킷
insert into storage.buckets (id, name, public)
  values ('missionNews', 'missionNews', false)
  on conflict (id) do nothing;

-- 2. 내용 테이블 (church_news_content 와 같은 모양)
create table if not exists public.mission_news_content (
  id      text primary key,   -- 'YYYY-MM-DD_<ts>' — storage 파일명 접두와 같다
  title   text,
  content text,
  date    date not null
);
alter table public.mission_news_content enable row level security;

revoke all on public.mission_news_content from anon;
grant select, insert, update, delete on public.mission_news_content to authenticated;

create policy "mission_select_approved" on public.mission_news_content
  for select to authenticated
  using ((select public.current_access_level()) >= 1);

create policy "mission_insert_admin" on public.mission_news_content
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "mission_update_admin" on public.mission_news_content
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "mission_delete_admin" on public.mission_news_content
  for delete to authenticated
  using ((select public.is_admin()));

-- 3. Storage 정책. SELECT 가 있어야 서명 URL 을 만들 수 있다.
create policy "approved list missionNews" on storage.objects
  for select to authenticated
  using (bucket_id = 'missionNews' and (select public.current_access_level()) >= 1);

-- 관리자 쓰기 정책은 버킷 목록을 열거하는 식이라 missionNews 를 더한다.
-- (drop/create 대신 alter policy — MCP 가 drop 문을 파괴적 변경으로 막는다.)
alter policy "obj_insert_admin" on storage.objects
  with check (bucket_id in ('churchNews','photoAlbum','weeklyBulletin','missionNews') and (select public.is_admin()));

alter policy "obj_update_admin" on storage.objects
  using      (bucket_id in ('churchNews','photoAlbum','weeklyBulletin','missionNews') and (select public.is_admin()))
  with check (bucket_id in ('churchNews','photoAlbum','weeklyBulletin','missionNews') and (select public.is_admin()));

alter policy "obj_delete_admin" on storage.objects
  using (bucket_id in ('churchNews','photoAlbum','missionNews') and (select public.is_admin()));
-- weeklyBulletin DELETE 는 obj_delete_bulletin_admin 이 담당한다(그대로).

-- 4. 기존 정적 목록(src/data/index.ts 의 missionNewsList 6건)은 적용 직후
--    같은 내용으로 insert 해 두었다(제목 = '지역 · 제목 — 선교사', 본문 끝에 기도제목).
