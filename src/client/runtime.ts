/**
 * Shared runtime handles across slot scopes.
 * The selection toolbar mounts at root (`shell.overlay`) while the annotation
 * panel is session-scoped — pending annotations use one shared store key so
 * both sides always read the same list.
 */
export const runtime: {
  sessionId?: string
} = {}

export function setRuntimeSession(sessionId: string | undefined): void {
  if (sessionId) runtime.sessionId = sessionId
}

/** Store partition for pending annotations (single active composer). */
export function annotationStoreKey(): string {
  return 'pending'
}
