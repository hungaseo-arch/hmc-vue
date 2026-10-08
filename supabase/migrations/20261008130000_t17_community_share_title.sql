-- ============================================================================
-- T17 — 공유 카드용 제목 조회 (2026-10 요청: 카드에 소식 제목만, 설명·그림 없이)
--
-- 카카오톡·WhatsApp 서버는 로그인 없이 페이지를 읽어 미리보기 카드를 만든다.
-- 그래서 제목 하나만 돌려주는 함수를 anon 에게 연다(security definer 로 RLS 를
-- 우회하되, 본문·사진·날짜 등 다른 열은 절대 돌려주지 않는다). Worker(src/worker.ts)
-- 가 이 함수로 og:title 을 채운다. 주보는 테이블이 없어 날짜로 제목을 만든다.
-- ============================================================================
create or replace function public.community_share_title(kind text, item_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case kind
    when 'news'         then (select title from public.church_news_content  where id = item_id)
    when 'mission-news' then (select title from public.mission_news_content where id = item_id)
    when 'photos'       then (select title from public.photo_album_meta     where id = item_id)
    else null
  end;
$$;

revoke all on function public.community_share_title(text, text) from public;
grant execute on function public.community_share_title(text, text) to anon, authenticated;
