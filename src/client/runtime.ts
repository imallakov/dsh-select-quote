/**
 * Shared runtime handles across slot scopes.
 * The selection toolbar mounts at root (`shell.overlay`) while the annotation
 * panel is session-scoped — they share the active session id here.
 */
export const runtime: {
  sessionId?: string
} = {}

export function setRuntimeSession(sessionId: string | undefined): void {
  runtime.sessionId = sessionId
}

export function resolveSessionId(own?: string): string | undefined {
  return own ?? runtime.sessionId
}
