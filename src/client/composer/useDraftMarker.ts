import { useEffect, type MutableRefObject } from 'react'
import { DRAFT_MARKER, stripDraftMarker, withDraftMarker } from '../protocol/quote-protocol.ts'

export interface DraftMarkerDeps {
  /** Pending quote count for the current session. */
  readonly quoteCount: number
  readonly sessionId: string | undefined
  readonly draftRef: MutableRefObject<string>
  readonly setDraft: (text: string) => void
}

/**
 * Keep the composer's own send button usable while only quotes are pending:
 * an invisible marker makes an otherwise empty draft non-empty.
 *
 * Written ONCE per quote-list change — never on a draft change. Rewriting the
 * editor in response to the draft fights the user: backspacing through the
 * marker would immediately restore it (so deletion looks broken), and an
 * in-flight IME composition would be destroyed mid-keystroke.
 */
export function useDraftMarker({
  quoteCount,
  sessionId,
  draftRef,
  setDraft,
}: DraftMarkerDeps): void {
  useEffect(() => {
    if (quoteCount === 0 || !sessionId) return
    const current = draftRef.current
    if (current.includes(DRAFT_MARKER)) return
    // Draft text already keeps the composer submittable; no marker needed.
    if (current.trim() !== '') return
    setDraft(withDraftMarker(current))
  }, [quoteCount, sessionId, draftRef, setDraft])
}

/** Drop the invisible send marker (e.g. when the last quote card is removed). */
export function clearDraftMarker(draft: string, setDraft: (text: string) => void): void {
  if (!draft.includes(DRAFT_MARKER)) return
  setDraft(stripDraftMarker(draft))
}
