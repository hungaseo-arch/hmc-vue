-- is_admin() 은 authenticated 정책에서만 쓰인다. anon/public 에게는 필요 없다.
revoke execute on function public.is_admin() from anon, public;
grant  execute on function public.is_admin() to authenticated;
