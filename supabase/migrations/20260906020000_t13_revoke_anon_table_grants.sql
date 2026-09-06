-- ============================================================================
-- T13 — anon 역할의 테이블 권한 회수
--
-- Supabase 는 public 스키마에 테이블을 만들면 기본 권한(ALTER DEFAULT
-- PRIVILEGES)으로 anon·authenticated 에게 모든 권한을 붙인다. T12 는
-- staff_contacts 를 authenticated 에게만 grant 했지만, 기본 권한이 이미
-- 걸린 뒤라 anon 에게도 SELECT·INSERT·UPDATE·DELETE 가 그대로 남았다.
--
-- 실제로 뚫리지는 않는다. 두 테이블 다 RLS 가 켜져 있고 정책이 전부
-- to authenticated 라 로그인하지 않은 요청은 0행으로 돌아온다. 그래도
-- T10 과 같은 이유로 "막혀 있어야 할 문이 열려 있는데 안쪽 자물쇠 덕에
-- 무사한" 상태를 남겨 두지 않는다. 교역자 연락처는 특히 자물쇠 하나에
-- 기대고 싶지 않은 자료다.
--
-- 이 사이트에서 anon 이 무언가를 쓰는 경로는 하나도 없다. 회원가입조차
-- auth 쪽 supabase_auth_admin 이 처리하고, 화면의 모든 등록·수정은
-- 로그인한 관리자만 한다. 그래서 읽기만 남기고 쓰기는 전부 뗀다.
-- ============================================================================

revoke insert, update, delete, truncate, references, trigger
  on public.staff,
     public.staff_contacts,
     public.sermons,
     public."pastorColumn",
     public.church_news_content,
     public.photo_album_meta
  from anon;

-- 연락처는 anon 에게 읽기도 필요 없다. staff(이름·직함·사진)는 로그인
-- 없이 보이는 화면이라 SELECT 를 남긴다.
revoke select on public.staff_contacts from anon;

-- 접속 기록은 관리자만 보는 자료다. anon 이 읽을 이유가 없다.
revoke select, references, trigger on public.access_audit_log from anon;

-- profiles 는 P4 에서 읽기·쓰기를 이미 뗐지만 TRUNCATE 가 남아 있었다.
-- TRUNCATE 는 RLS 를 거치지 않는 명령이라, 다른 권한과 달리 정책이
-- 뒤를 받쳐 주지 않는다.
revoke truncate, trigger on public.profiles from anon;
