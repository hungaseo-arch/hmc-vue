import { supabase } from '@/lib/supabase'

/**
 * Signed-URL policy for the private members-only buckets
 * (churchNews / photoAlbum / weeklyBulletin).
 *
 * A signed URL is a bearer token: whoever holds it can fetch the object
 * regardless of auth. Expiry is therefore the only real control, and these two
 * constants are the single place it is defined — never inline a TTL at a call site.
 *
 * We mint for 1 hour but re-mint at 45 minutes, so a URL handed to the browser
 * is never close to expiring at render time.
 */
export const SIGNED_URL_TTL_SEC = 60 * 60
export const SIGNED_URL_REFRESH_MS = 45 * 60 * 1000

/** createSignedUrls sends every path in one request body; chunk for sanity. */
const CHUNK = 500

/**
 * Batch-mint signed URLs for storage paths.
 *
 * Returns a `path -> signedUrl` map. Paths that were denied by RLS or are
 * missing are omitted rather than throwing, so one bad file cannot blank out a
 * whole album — callers should `.filter(Boolean)` the result of a lookup.
 */
export async function signPaths(
  bucket: string,
  paths: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (paths.length === 0) return out

  for (let i = 0; i < paths.length; i += CHUNK) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths.slice(i, i + CHUNK), SIGNED_URL_TTL_SEC)
    if (error) throw error
    for (const row of data ?? []) {
      // Note the per-entry `error`: the batch succeeds even when individual
      // paths fail, so the top-level check above is not sufficient on its own.
      if (row.error || !row.path || !row.signedUrl) continue
      out[row.path] = row.signedUrl
    }
  }
  return out
}
