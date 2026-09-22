/** Per-session pending selection annotations (composer-side store). */

import {
  previewTitle,
  type AnnotationSource,
  type SelectionAnnotation,
} from '../protocol/annotation-protocol.ts'

export type { SelectionAnnotation, AnnotationSource }

const EMPTY: readonly SelectionAnnotation[] = []

const bySession = new Map<string, SelectionAnnotation[]>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of [...listeners]) listener()
}

export function subscribeAnnotations(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export interface SaveAnnotationInput {
  readonly text: string
  readonly comment?: string
  readonly sources?: readonly AnnotationSource[]
}

/** Append one selection; an identical text+comment pair is reused. */
export function saveAnnotation(sessionId: string, input: SaveAnnotationInput): SelectionAnnotation {
  const comment = input.comment?.trim() ?? ''
  const current = bySession.get(sessionId) ?? EMPTY
  const duplicate = current.find(
    (item) => item.text === input.text && (item.comment ?? '') === comment,
  )
  if (duplicate) return duplicate

  const annotation: SelectionAnnotation = {
    id: `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    text: input.text,
    ...(comment ? { comment } : {}),
    sources: input.sources?.length
      ? input.sources
      : [{ text: input.text }],
  }
  bySession.set(sessionId, [...current, annotation])
  notify()
  return annotation
}

export function getAnnotations(sessionId: string): readonly SelectionAnnotation[] {
  return bySession.get(sessionId) ?? EMPTY
}

export function updateAnnotationComment(
  sessionId: string,
  id: string,
  comment: string,
): void {
  const current = bySession.get(sessionId)
  if (!current) return
  const next = current.map((item) => {
    if (item.id !== id) return item
    const trimmed = comment.trim()
    return trimmed
      ? { ...item, comment: trimmed }
      : { ...item, comment: undefined }
  })
  bySession.set(sessionId, next)
  notify()
}

export function removeAnnotation(sessionId: string, id: string): void {
  const current = bySession.get(sessionId)
  if (!current) return
  const next = current.filter((item) => item.id !== id)
  if (next.length === current.length) return
  if (next.length === 0) bySession.delete(sessionId)
  else bySession.set(sessionId, next)
  notify()
}

export function clearAnnotations(sessionId: string): void {
  if (bySession.delete(sessionId)) notify()
}

export function annotationTitle(annotation: SelectionAnnotation): string {
  return previewTitle(annotation.text)
}
