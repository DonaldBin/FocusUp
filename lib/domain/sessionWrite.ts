/**
 * Active session last-write-wins (PRD §4.6 / Task 5.1).
 * Newer (or equal) client/server timestamps win; older writes are rejected.
 */

export function shouldAcceptSessionWrite(
  existingUpdatedAt: Date | null | undefined,
  incomingUpdatedAt: Date,
): boolean {
  if (!existingUpdatedAt) {
    return true;
  }
  return incomingUpdatedAt.getTime() >= existingUpdatedAt.getTime();
}
