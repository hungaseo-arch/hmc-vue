import { supabase } from '@/lib/supabase'

/**
 * Signed-URL policy for the private members-only buckets
 * (churchNews / photoAlbum / weeklyBulletin).
 *
 * A signed URL is a bearer token: whoever holds it can fetch the object
 * regardless of auth. Expiry is therefore the only real control, and these two
 * constants are the single place it is defined - never inline a TTL at a call site.
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
 * whole album - callers should `.filter(Boolean)` the result of a lookup.
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

/**
 * Thumbnail geometry for the album / news grids.
 *
 * The cells are `h-48` (192px) and at most ~400px wide, so 640x384 covers a 2x
 * display without overshooting. Originals average 221KB; a grid of 31 of them
 * was ~6.8MB. Transformed thumbnails come back as WebP automatically.
 */
export const THUMB = { width: 640, height: 384, resize: 'cover', quality: 70 } as const

/** Individual signs run concurrently, but not all at once. */
const THUMB_CONCURRENCY = 8

/**
 * Mint transformed (resized) signed URLs.
 *
 * Deliberately separate from `signPaths`: the batch endpoint does not accept
 * transform options - the transformation is baked into the token, so each URL
 * needs its own request. Only pass the one image per item that a grid actually
 * shows; Supabase bills per distinct origin image transformed per month
 * (Pro includes 100), so transforming whole albums would be wasteful.
 *
 * Failures are dropped from the map rather than thrown; callers should fall
 * back to the full-size URL.
 */
export async function signThumbnails(
  bucket: string,
  paths: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (paths.length === 0) return out

  let next = 0
  async function worker() {
    while (next < paths.length) {
      const path = paths[next++]
      try {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, SIGNED_URL_TTL_SEC, { transform: { ...THUMB } })
        if (data?.signedUrl) out[path] = data.signedUrl
      } catch {
        // 원본 URL 로 대체된다.
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(THUMB_CONCURRENCY, paths.length) }, worker)
  )
  return out
}
