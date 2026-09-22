/**
 * Quote wire protocol shared by the composer (write) and the transcript (read).
 *
 * Composer folds pending selections into the outgoing draft as:
 *
 *   > [选中文本]
 *   > line one
 *   > line two
 *
 * `scanQuoteMessage` is the single reader for that shape.
 */

export const QUOTE_MARKER = '> [选中文本]'

/**
 * Invisible draft marker (U+200B) that keeps the composer's own send button
 * enabled while only quotes are pending: the composer then treats the draft as
 * non-empty, and the marker never reaches the message.
 */
export const DRAFT_MARKER = '\u200B'

const DRAFT_MARKER_RE = /\u200B/g

export interface ParsedQuote {
  /** Short preview title for the card. */
  readonly title: string
  /** Full selected text (without `>` / marker). */
  readonly body: string
}

export interface QuoteScan {
  /** Every plugin quote block found in the text. */
  readonly quotes: readonly ParsedQuote[]
  /** Original text with every plugin quote block removed. */
  readonly rest: string
}

/** Plain text from Chat user-node content blocks (string or block array). */
export function contentBlocksToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (block && typeof block === 'object' && 'text' in block) {
        const text = (block as { text?: unknown }).text
        return typeof text === 'string' ? text : ''
      }
      return ''
    })
    .join('')
}

/**
 * Best-effort plain text from a durable `user/message` event. A surface event
 * carries its blocks directly on `data.content`; `data.message.content` is only
 * a fallback for the older shape.
 */
export function extractUserText(event: unknown): string {
  const data = (event as { data?: { content?: unknown; message?: { content?: unknown } } } | null)
    ?.data
  if (!data) return ''
  return contentBlocksToText(data.content ?? data.message?.content)
}

/** Short one-line card title from selected body text. */
export function previewTitle(text: string, max = 48): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

/**
 * Markdown blockquote of the selection — what the model should read.
 * `[选中文本]` marks the block as plugin-injected (not a hand-typed quote).
 */
export function formatQuoteBlock(text: string): string {
  const body = text
    .split('\n')
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join('\n')
  return `> [选中文本]\n${body}`
}

/** Ensure the draft carries the invisible marker, without disturbing its text. */
export function withDraftMarker(draft: string): string {
  return draft.includes(DRAFT_MARKER) ? draft : `${draft}${DRAFT_MARKER}`
}

/** Remove every invisible marker from a draft. */
export function stripDraftMarker(draft: string): string {
  return draft.split(DRAFT_MARKER).join('')
}

/**
 * Fold every pending quote block into the draft. Called only at the send
 * gesture, so the composer never displays the markdown while the user types.
 */
export function composeSubmission(draft: string, quoteBlocks: readonly string[]): string {
  const rest = stripDraftMarker(draft).replace(/^\s+/, '')
  const prefix = quoteBlocks.filter((block) => block.length > 0).join('\n\n')
  if (prefix === '') return rest
  // Avoid duplicating blocks that already reached the draft.
  if (quoteBlocks.every((block) => rest.includes(block))) return rest
  return rest ? `${prefix}\n\n${rest}` : `${prefix}\n\n`
}

function toQuote(body: readonly string[]): ParsedQuote | null {
  const text = body.join('\n').trim()
  if (!text) return null
  return { title: previewTitle(text), body: text }
}

/**
 * Single-pass reader for plugin quote blocks. Yields both the parsed quotes
 * and the leftover display text (question / non-quote lines).
 */
export function scanQuoteMessage(text: string): QuoteScan {
  const quotes: ParsedQuote[] = []
  const restLines: string[] = []
  let body: string[] | null = null

  const close = (): void => {
    if (body === null) return
    const quote = toQuote(body)
    if (quote) quotes.push(quote)
    body = null
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trimEnd()
    const isMarker = trimmed === QUOTE_MARKER || trimmed.startsWith(QUOTE_MARKER)

    if (body === null) {
      if (isMarker) body = []
      else restLines.push(line)
      continue
    }
    if (trimmed.startsWith('>')) {
      body.push(trimmed.replace(/^>\s?/, ''))
      continue
    }
    close()
    // The blank line between two quotes is followed by the next marker.
    if (isMarker) body = []
    else restLines.push(line)
  }
  close()

  return {
    quotes,
    rest: restLines.join('\n').replace(/^\n+/, '').trim(),
  }
}

/** Detect every quote block in a durable message. Empty means none. */
export function parseQuoteMessage(text: string): readonly ParsedQuote[] {
  if (!text.includes(QUOTE_MARKER)) return []
  return scanQuoteMessage(text).quotes
}

/**
 * Display text for a user bubble: drop every plugin quote block so the
 * transcript shows only the question. The durable message (and model payload)
 * still contains the full `> [选中文本]` text.
 */
export function displayTextWithoutQuote(text: string): string {
  // The composer's invisible send marker is never message text.
  const clean = text.replace(DRAFT_MARKER_RE, '')
  if (!clean.includes(QUOTE_MARKER)) return clean
  return scanQuoteMessage(clean).rest
}
