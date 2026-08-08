-- Phase 2 — 성도 전용 자료를 비공개로 전환한다.
--
-- 서명 URL 을 쓰는 프런트엔드가 배포된 뒤에 적용했다. 구버전 번들은
-- getPublicUrl() 로 이미지를 부르므로 순서가 뒤집히면 주보·교회소식·
-- 포토앨범 이미지가 전부 404 가 된다.
--
-- 공개 유지: sermons(주일설교), pastorColumn(목회칼럼)
-- 성도 전용: weeklyBulletin(주보), churchNews(교회소식), photoAlbum(포토앨범)

-- ── 1. 버킷을 비공개로. 이후 접근은 서명 URL(1시간)로만 가능하다. ──────────
update storage.buckets
   set public = false
 where id in ('churchNews', 'photoAlbum', 'weeklyBulletin');

-- ── 2. anon 이 오브젝트를 나열/조회하던 정책을 제거 ────────────────────────
--    (SELECT 권한이 없으면 서명 URL 발급도 불가능하다.)
drop policy if exists "public list churchNews"                              on storage.objects;
drop policy if exists "public list photoAlbum"                              on storage.objects;
drop policy if exists "Allow public read eadr9k_0"                          on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1q69nx9_0" on storage.objects;

-- churchNews / photoAlbum 은 이미 authenticated SELECT 정책이 있다.
-- weeklyBulletin 만 새로 만든다.
drop policy if exists "authenticated list weeklyBulletin" on storage.objects;
create policy "authenticated list weeklyBulletin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'weeklyBulletin');

-- ── 3. 관리자 쓰기 정책을 authenticated 로 못박고 is_admin() 으로 통일 ──────
--    to public 이면 anon 까지 평가 대상이 된다(결과는 false 지만 불필요하다).
--    행마다 profiles 를 훑던 EXISTS 대신 문장당 한 번 평가되는 is_admin() 사용.
drop policy if exists "관리자 교회소식 업로드" on storage.objects;
drop policy if exists "관리자 교회소식 수정"   on storage.objects;
drop policy if exists "관리자 교회소식 삭제"   on storage.objects;
drop policy if exists "관리자 포토앨범 업로드" on storage.objects;
drop policy if exists "관리자 포토앨범 수정"   on storage.objects;
drop policy if exists "Admin can delete"       on storage.objects;
drop policy if exists "관리자 주보 업로드"     on storage.objects;
drop policy if exists "관리자 주보 수정"       on storage.objects;

create policy "obj_insert_admin" on storage.objects for insert to authenticated
  with check (bucket_id in ('churchNews','photoAlbum','weeklyBulletin') and (select public.is_admin()));

create policy "obj_update_admin" on storage.objects for update to authenticated
  using      (bucket_id in ('churchNews','photoAlbum','weeklyBulletin') and (select public.is_admin()))
  with check (bucket_id in ('churchNews','photoAlbum','weeklyBulletin') and (select public.is_admin()));

create policy "obj_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id in ('churchNews','photoAlbum') and (select public.is_admin()));
-- weeklyBulletin DELETE 는 obj_delete_bulletin_admin 이 이미 담당한다.

-- ── 4. 메타데이터 테이블도 성도 전용으로 ──────────────────────────────────
--    제목·본문만으로도 교회 내부 사정이 드러난다.
drop policy if exists "공개 조회" on public.church_news_content;
create policy "성도 조회" on public.church_news_content
  for select to authenticated using (true);

drop policy if exists "공개 조회" on public.photo_album_meta;
create policy "성도 조회" on public.photo_album_meta
  for select to authenticated using (true);

