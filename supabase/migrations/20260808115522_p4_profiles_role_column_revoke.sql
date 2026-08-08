-- 테이블 단위 GRANT 가 살아있으면 컬럼 단위 REVOKE 는 아무 효과가 없다.
-- 먼저 테이블 권한을 회수한 뒤 role 을 뺀 나머지 컬럼만 다시 부여한다.
revoke insert, update on public.profiles from authenticated;

grant insert (id, name, phone, position, gender, family_head, child1, child2, child3)
  on public.profiles to authenticated;

-- id 는 upsert(ON CONFLICT DO UPDATE)가 함께 SET 하므로 남겨둔다.
-- 남의 행으로 옮기는 것은 정책의 WITH CHECK (auth.uid() = id) 가 막는다.
grant update (id, name, phone, position, gender, family_head, child1, child2, child3)
  on public.profiles to authenticated;

-- profiles 에는 DELETE 정책이 없다. 권한 자체를 남겨둘 이유도 없다.
revoke delete on public.profiles from anon, authenticated;
