import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Why this module exists.
 *
 * When RLS filters out every candidate row, PostgREST returns 204 with
 * `error: null` — indistinguishable at the client from "you legitimately
 * updated 0 rows". Storage `.remove()` has the same trap: it resolves with
 * `{ data: [], error: null }` when a delete is denied.
 *
 * Several admin flows here used to patch local state optimistically on that
 * fake success, so the UI reported a save that never happened. These helpers
 * turn "0 rows affected" into a thrown error.
 */

export class NoRowsAffectedError extends Error {
  constructor(op: string) {
    super(`${op}에 실패했습니다. 권한이 없거나 대상이 존재하지 않습니다.`)
    this.name = 'NoRowsAffectedError'
  }
}

/**
 * Wrap a PostgREST write that must touch at least one row.
 * The builder MUST end in `.select(...)` — that is what makes the affected
 * rows observable.
 *
 * Caveat worth keeping in mind: the returned rows are themselves filtered by
 * the table's SELECT policy. On a table where you may write but not read, this
 * would raise a false "denied". That is safe for every table here (sermons and
 * pastorColumn are world-readable; church_news_content and photo_album_meta are
 * readable by any authenticated user and only written by admins; profiles is
 * own-row read and own-row write) — but re-check it if a SELECT policy is ever
 * tightened.
 */
export async function mustAffectRows<T>(
  op: string,
  builder: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const { data, error } = await builder
  if (error) throw error
  if (!data || data.length === 0) throw new NoRowsAffectedError(op)
  return data
}

/** Storage delete that must actually delete. See note above on silent denial. */
export async function mustRemoveFiles(
  op: string,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return
  const { data, error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw error
  if (!data || data.length < paths.length) throw new NoRowsAffectedError(op)
}
