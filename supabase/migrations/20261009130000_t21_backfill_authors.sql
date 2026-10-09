-- ============================================================================
-- T21 — 옛 글의 작성자 채우기 (일회성 데이터 보정, 2026-10 요청)
--
--   글 날짜(date) 2024-01-01 ~ 2026-09-30  → 서종환
--   글 날짜(date) 2026-10-01 ~ 2026-10-31  → 고형돈
--   그 이전(2023 이하)은 요청 범위 밖이라 건드리지 않는다.
--
-- 대상은 작성자가 아직 비어 있는 글(옛 글)뿐이다. 새로 올린 글은 덮어쓰지 않는다.
-- 대상: 교회소식·선교소식·포토앨범·주보. 내용 행이 없던 옛 글(파일만 있던 것)은
-- 행을 새로 만들어 작성자를 담는다.
--
-- 올린 시각(created_at)도 글 날짜로 맞춘다. 그래야 옛 글이 '올린 지 1달 지남' 으로
-- 처리되어 슈퍼관리자만 지울 수 있다(T20). 맞추지 않으면 이 SQL 을 실행한 시각이
-- 올린 시각이 되어 작성자가 한 달 동안 지울 수 있게 된다.
--
-- 작성자 고정 트리거(set_author)가 UPDATE·INSERT 값을 되돌리므로 보정하는 동안만
-- 끈다. 한 트랜잭션이라 중간에 실패하면 전부 취소된다.
-- 사람은 profiles.name 으로 찾는다. 이름이 둘 이상이면 중단하고, 한 명도 없으면
-- 이름만 기록하고 author_id 는 비운다(그 글은 슈퍼관리자만 삭제).
-- ============================================================================

do $$
declare
  v_seo  uuid;  v_seo_n  int;
  v_ko   uuid;  v_ko_n   int;
  t      text;
  n      int;
begin
  select count(*), min(id::text)::uuid into v_seo_n, v_seo from public.profiles where name = '서종환';
  select count(*), min(id::text)::uuid into v_ko_n,  v_ko  from public.profiles where name = '고형돈';
  if v_seo_n > 1 then raise exception '이름이 서종환인 프로필이 % 명입니다. 하나로 정리한 뒤 다시 실행하세요.', v_seo_n; end if;
  if v_ko_n  > 1 then raise exception '이름이 고형돈인 프로필이 % 명입니다. 하나로 정리한 뒤 다시 실행하세요.', v_ko_n; end if;
  if v_seo_n = 0 then raise notice '서종환 프로필 없음 - author_id 는 비워 둔다'; end if;
  if v_ko_n  = 0 then raise notice '고형돈 프로필 없음 - author_id 는 비워 둔다'; end if;

  foreach t in array array['church_news_content','mission_news_content','photo_album_meta','bulletin_meta'] loop
    execute format('alter table public.%I disable trigger set_author', t);
  end loop;

  -- 1. 내용 행이 없던 옛 글에 행을 만든다(파일 이름에서 id·날짜를 읽는다).
  insert into public.church_news_content (id, date)
  select distinct b.base, substring(b.base from '^\d{4}-\d{2}-\d{2}')::date
    from (select regexp_replace(regexp_replace(o.name, '\.[^.]+$', ''), '_p\d{2}$', '') as base
            from storage.objects o where o.bucket_id = 'churchNews') b
   where b.base ~ '^\d{4}-\d{2}-\d{2}_'
  on conflict (id) do nothing;

  insert into public.mission_news_content (id, date)
  select distinct b.base, substring(b.base from '^\d{4}-\d{2}-\d{2}')::date
    from (select regexp_replace(regexp_replace(o.name, '\.[^.]+$', ''), '_p\d{2}$', '') as base
            from storage.objects o where o.bucket_id = 'missionNews') b
   where b.base ~ '^\d{4}-\d{2}-\d{2}_'
  on conflict (id) do nothing;

  -- title 을 비워 둔다: 목록이 제목을 파일 이름·기존 표에서 찾는 경로를 그대로 쓴다.
  insert into public.photo_album_meta (id)
  select distinct m[1] || '_' || m[2]
    from (select regexp_match(o.name, '^(\d{4}-\d{2}-\d{2})_(\d+)(?:_t-[^_]+)?_p\d+\.\w+$') as m
            from storage.objects o where o.bucket_id = 'photoAlbum') x
   where m is not null
  on conflict (id) do nothing;

  insert into public.bulletin_meta (id)
  select distinct substring(o.name from '^(\d{8})-')
    from storage.objects o
   where o.bucket_id = 'weeklyBulletin' and o.name ~ '^\d{8}-'
  on conflict (id) do nothing;

  -- 2. 작성자·올린 시각 채우기 (작성자가 비어 있는 글만)
  -- 교회소식·선교소식: date 컬럼
  foreach t in array array['church_news_content','mission_news_content'] loop
    execute format($f$
      update public.%1$I set author_id = %2$L, author_name = '서종환', created_at = date::timestamptz
       where author_id is null and author_name is null and date >= '2024-01-01' and date < '2026-10-01'
    $f$, t, v_seo);
    get diagnostics n = row_count; raise notice '% 서종환: % 건', t, n;
    execute format($f$
      update public.%1$I set author_id = %2$L, author_name = '고형돈', created_at = date::timestamptz
       where author_id is null and author_name is null and date >= '2026-10-01' and date < '2026-11-01'
    $f$, t, v_ko);
    get diagnostics n = row_count; raise notice '% 고형돈: % 건', t, n;
  end loop;

  -- 포토앨범: id 앞 10자가 날짜
  update public.photo_album_meta set author_id = v_seo, author_name = '서종환',
         created_at = substring(id from '^\d{4}-\d{2}-\d{2}')::timestamptz
   where author_id is null and author_name is null and id ~ '^\d{4}-\d{2}-\d{2}_'
     and substring(id from '^\d{4}-\d{2}-\d{2}')::date >= '2024-01-01'
     and substring(id from '^\d{4}-\d{2}-\d{2}')::date <  '2026-10-01';
  get diagnostics n = row_count; raise notice 'photo_album_meta 서종환: % 건', n;
  update public.photo_album_meta set author_id = v_ko, author_name = '고형돈',
         created_at = substring(id from '^\d{4}-\d{2}-\d{2}')::timestamptz
   where author_id is null and author_name is null and id ~ '^\d{4}-\d{2}-\d{2}_'
     and substring(id from '^\d{4}-\d{2}-\d{2}')::date >= '2026-10-01'
     and substring(id from '^\d{4}-\d{2}-\d{2}')::date <  '2026-11-01';
  get diagnostics n = row_count; raise notice 'photo_album_meta 고형돈: % 건', n;

  -- 주보: id 가 YYYYMMDD
  update public.bulletin_meta set author_id = v_seo, author_name = '서종환',
         created_at = to_date(id, 'YYYYMMDD')::timestamptz
   where author_id is null and author_name is null and id ~ '^\d{8}$'
     and to_date(id, 'YYYYMMDD') >= '2024-01-01' and to_date(id, 'YYYYMMDD') < '2026-10-01';
  get diagnostics n = row_count; raise notice 'bulletin_meta 서종환: % 건', n;
  update public.bulletin_meta set author_id = v_ko, author_name = '고형돈',
         created_at = to_date(id, 'YYYYMMDD')::timestamptz
   where author_id is null and author_name is null and id ~ '^\d{8}$'
     and to_date(id, 'YYYYMMDD') >= '2026-10-01' and to_date(id, 'YYYYMMDD') < '2026-11-01';
  get diagnostics n = row_count; raise notice 'bulletin_meta 고형돈: % 건', n;

  foreach t in array array['church_news_content','mission_news_content','photo_album_meta','bulletin_meta'] loop
    execute format('alter table public.%I enable trigger set_author', t);
  end loop;
end $$;
