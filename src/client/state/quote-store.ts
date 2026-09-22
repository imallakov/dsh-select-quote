/** Per-session pending quote cards (composer-side store). */

import { formatQuoteBlock, previewTitle, type ParsedQuote } from '../protocol/quote-protocol.ts'

export type { ParsedQuote }

export interface StoredQuote extends ParsedQuote {
  readonly id: string
  /** Full selected text (same as body). */
  readonly text: string
  /** Exact block folded into the outgoing message at the send gesture. */
  readonly draftBlock: string
}

const EMPTY_QUOTES: readonly StoredQuote[] = []

const bySession = new Map<string, StoredQuote[]>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of [...listeners]) listener()
}

/** Observe store changes (save / remove / clear). Returns the unsubscribe callback. */
export function subscribeQuotes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Append one selection as a quote card; an identical pending quote is reused. */
export function saveQuote(sessionId: string, text: string): StoredQuote {
  const draftBlock = formatQuoteBlock(text)
  const current = bySession.get(sessionId) ?? EMPTY_QUOTES
  const duplicate = current.find((quote) => quote.draftBlock === draftBlock)
  if (duplicate) return duplicate

  const quote: StoredQuote = {
    id: `sq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    body: text,
    title: previewTitle(text),
    draftBlock,
  }
  bySession.set(sessionId, [...current, quote])
  notify()
  return quote
}

export function getQuotes(sessionId: string): readonly StoredQuote[] {
  return bySession.get(sessionId) ?? EMPTY_QUOTES
}

export function removeQuote(sessionId: string, id: string): void {
  const current = bySession.get(sessionId)
  if (!current) return
  const next = current.filter((quote) => quote.id !== id)
  if (next.length === current.length) return
  if (next.length === 0) bySession.delete(sessionId)
  else bySession.set(sessionId, next)
  notify()
}

export function clearQuotes(sessionId: string): void {
  if (bySession.delete(sessionId)) notify()
}
