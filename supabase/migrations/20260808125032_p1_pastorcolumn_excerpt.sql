-- 목회칼럼 목록이 본문 HTML 전체를 받아 2줄 미리보기로 쓰고 있었다.
-- 134행 × 평균 714자 = 243KB(gzip 93KB)를 매번 내려받는다.
--
-- 미리보기용 발췌를 DB 에서 만들어 목록은 excerpt 만 가져가게 한다.
-- 생성 컬럼이라 content 를 고치면 자동으로 따라간다.
alter table public."pastorColumn"
  add column if not exists excerpt text
  generated always as (
    left(
      btrim(
        regexp_replace(
          replace(replace(replace(replace(
            regexp_replace(coalesce(content, ''), '<[^>]*>', ' ', 'g'),
            '&nbsp;', ' '), '&amp;', '&'), '&lt;', '<'), '&gt;', '>'),
          '\s+', ' ', 'g')
      ),
      200)
  ) stored;

comment on column public."pastorColumn".excerpt is
  '목록 미리보기용. content 에서 태그를 걷어낸 앞 200자 (생성 컬럼).';
