import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { composerCardOf } from '../dom/composer-host.ts'
import {
  getQuotes,
  removeQuote,
  subscribeQuotes,
  type StoredQuote,
} from '../state/quote-store.ts'
import { ensureToolbarStyles, styles } from '../styles.ts'
import { QuoteCardView } from '../ui/QuoteCardView.tsx'
import { clearDraftMarker, useDraftMarker } from './useDraftMarker.ts'
import { useSendIntercept } from './useSendIntercept.ts'

export interface QuoteCardProps {
  useInput: <T>(selector: (state: { draft: string; draftRev: number }) => T) => T
  inputActions: {
    setDraft(text: string): void
  }
  sessionId?: string
}

const NO_QUOTES: readonly StoredQuote[] = []

/**
 * Composer quote card stack (`conversation.input.overlay`).
 *
 * Selections never enter the editor as text: the cards are the only thing the
 * user sees, and the markdown blocks are folded into the draft one capture-phase
 * step before the composer's own send handler reads it.
 */
export function QuoteCard({ useInput, inputActions, sessionId }: QuoteCardProps): ReactNode {
  const draft = useInput((state) => state.draft)
  const [quotes, setQuotes] = useState<readonly StoredQuote[]>(NO_QUOTES)
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
    const id = sessionRef.current
    setQuotes(id ? getQuotes(id) : NO_QUOTES)
  }, [])

  const onFolded = useCallback(() => {
    setQuotes(NO_QUOTES)
  }, [])

  useEffect(() => {
    ensureToolbarStyles()
    sync()
    return subscribeQuotes(sync)
  }, [sync, sessionId])

  // Reserve the stack's height inside the composer so the attachment rail and
  // the editor flow below it instead of being covered by the floating cards.
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
  }, [quotes])

  useDraftMarker({
    quoteCount: quotes.length,
    sessionId,
    draftRef,
    setDraft,
  })

  useSendIntercept({
    quoteCount: quotes.length,
    sessionId,
    draftRef,
    setDraft,
    onFolded,
  })

  const onRemove = useCallback(
    (id: string) => {
      const active = sessionRef.current
      if (!active) return
      removeQuote(active, id)
      const rest = getQuotes(active)
      setQuotes(rest)
      // The last card takes the invisible send marker with it.
      if (rest.length === 0) clearDraftMarker(draftRef.current, setDraft)
    },
    [setDraft],
  )

  if (!sessionId || quotes.length === 0) return null

  return jsx('div', {
    ref: stackRef,
    className: styles.cardStack,
    children: quotes.map((quote) =>
      jsx(
        QuoteCardView,
        {
          variant: 'composer',
          title: quote.title,
          body: quote.text,
          onRemove: () => onRemove(quote.id),
        },
        quote.id,
      ),
    ),
  })
}
