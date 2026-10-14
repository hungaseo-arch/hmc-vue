-- ============================================================================
-- T25 — 포토앨범 정보 행의 id 고정 (T24 보강)
--
-- 작성자·올린 시각은 set_post_author 트리거(T18·T20)가 UPDATE 때 원래 값으로
-- 되돌린다. id 는 그렇지 않다. T24 의 UPDATE 정책이 새 id 로도
-- may_manage_album 을 검사하므로 지금도 남의 앨범 id 로 바꿀 수는 없지만, 그
-- 판정이 검사 시점에 새 행이 보이지 않는다는 데 기대고 있다. 규칙으로 못 박는다.
--
-- id 는 사진 파일 이름의 접두라 바뀌면 사진과 정보가 갈라진다. 바꿀 일이 없다.
-- 슈퍼관리자만 예외로 둔다(옛 앨범 정리용).
-- ============================================================================

create or replace function public.pin_album_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id and not public.is_super_admin() then
    raise exception '앨범 ID 는 바꿀 수 없습니다.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.pin_album_id() from public;

drop trigger if exists pin_album_id on public.photo_album_meta;
create trigger pin_album_id before update on public.photo_album_meta
  for each row execute function public.pin_album_id();
