import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { composerCardOf } from '../dom/composer-host.ts'
import { resolveSessionId, setRuntimeSession } from '../runtime.ts'
import {
  annotationTitle,
  clearAnnotations,
  getAnnotations,
  subscribeAnnotations,
  type SelectionAnnotation,
} from '../state/annotation-store.ts'
import { ensureToolbarStyles, styles } from '../styles.ts'
import { AnnotationSummary } from '../ui/AnnotationCardView.tsx'
import { clearDraftMarker, useDraftMarker } from './useDraftMarker.ts'
import { useSendIntercept } from './useSendIntercept.ts'

export interface AnnotationPanelProps {
  useInput: <T>(selector: (state: { draft: string; draftRev: number }) => T) => T
  inputActions: {
    setDraft(text: string): void
  }
  sessionId?: string
}

const EMPTY: readonly SelectionAnnotation[] = []

/**
 * Composer annotation summary (`conversation.input.overlay`).
 *
 * Pending selections never enter the editor as text: the summary card is the
 * only affordance, and the JSON protocol block is folded into the draft one
 * capture-phase step before the composer's own send handler reads it.
 */
export function AnnotationPanel({
  useInput,
  inputActions,
  sessionId,
}: AnnotationPanelProps): ReactNode {
  const draft = useInput((state) => state.draft)
  const [items, setItems] = useState<readonly SelectionAnnotation[]>(EMPTY)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const draftRef = useRef(draft)
  const actionsRef = useRef(inputActions)
  const sessionRef = useRef(sessionId)
  draftRef.current = draft
  actionsRef.current = inputActions
  sessionRef.current = sessionId

  const setDraft = useCallback((text: string) => {
    actionsRef.current.setDraft(text)
  }, [])

  const sync = useCallback(() => {
    const id = resolveSessionId(sessionRef.current)
    setItems(id ? getAnnotations(id) : EMPTY)
  }, [])

  useEffect(() => {
    if (sessionId) setRuntimeSession(sessionId)
  }, [sessionId])

  useEffect(() => {
    ensureToolbarStyles()
    sync()
    return subscribeAnnotations(sync)
  }, [sync, sessionId])

  useEffect(() => {
    const element = stackRef.current
    if (!element) return
    const card = composerCardOf(element)
    if (!card) return
    const apply = (): void => {
      card.style.setProperty('--dsq-quote-pad', `${element.offsetHeight + 20}px`)
    }
    card.classList.add(styles.cardPad)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(element)
    return () => {
      observer.disconnect()
      card.classList.remove(styles.cardPad)
      card.style.removeProperty('--dsq-quote-pad')
    }
  }, [items])

  useDraftMarker({ itemCount: items.length, sessionId, draftRef, setDraft })
  useSendIntercept({
    itemCount: items.length,
    sessionId,
    draftRef,
    setDraft,
    onFolded: () => setItems(EMPTY),
  })

  const onRemoveAll = useCallback(() => {
    const active = sessionRef.current
    if (!active) return
    clearAnnotations(active)
    setItems(EMPTY)
    clearDraftMarker(draftRef.current, setDraft)
  }, [setDraft])

  if (!sessionId || items.length === 0) return null

  return jsx('div', {
    ref: stackRef,
    className: styles.cardStack,
    children: AnnotationSummary({
      count: items.length,
      items: items.map((item) => ({
        title: annotationTitle(item),
        text: item.text,
        comment: item.comment,
      })),
      onRemoveAll,
    }),
  })
}

/** Alias kept for overlay registration. */
export const QuoteCard = AnnotationPanel
