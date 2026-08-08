/**
 * Tiny registry so `useAuth` can clear every data cache on sign-out without
 * importing the composables (which would be a circular import).
 *
 * The composables hold members-only titles, content and still-valid signed
 * URLs in module scope. Without this, logging out on a shared or family device
 * leaves that data readable by the next person.
 */
const resetters = new Set<() => void>()

export function registerCache(reset: () => void) {
  resetters.add(reset)
}

export function resetAllCaches() {
  for (const reset of resetters) reset()
}
