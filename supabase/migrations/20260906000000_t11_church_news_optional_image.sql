-- ============================================================================
-- T11: 교회소식을 이미지 없이도 등록할 수 있게
-- ============================================================================
-- church_news_content 는 title·content 뿐이고, 목록(useChurchNews.load())은
-- storage 의 파일 그룹(_p01 등)을 훑어서 항목을 찾아낸다. 즉 "이 소식이
-- 존재한다"는 사실 자체가 이미지 파일의 존재에 얹혀 있었다 — 이미지를 하나도
-- 안 올리면 DB 행이 있어도 목록에 아예 안 뜬다.
--
-- date 를 DB 에 독립적으로 저장해 두면, 목록 조회를 storage 그룹과
-- church_news_content 행의 합집합으로 바꿀 수 있다(useChurchNews.ts 참고).
-- 기존 행은 id 앞부분이 이미 'YYYY-MM-DD_...' 형식이라 그대로 뽑아 채운다.

alter table public.church_news_content add column if not exists date date;

update public.church_news_content
  set date = substring(id from '^(\d{4}-\d{2}-\d{2})')::date
  where date is null;

alter table public.church_news_content alter column date set not null;
