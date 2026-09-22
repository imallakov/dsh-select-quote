import type { ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { ensureToolbarStyles, styles } from '../styles.ts'
import { QuoteCardView } from '../ui/QuoteCardView.tsx'
import type { SelectQuoteNodeData } from './transcript-node.ts'

export interface TranscriptQuoteCardProps {
  node: { data: SelectQuoteNodeData }
}

/**
 * Transcript cards for the plugin-injected quotes of one user message.
 * Renders in the Chat node list; the same text remains in the durable
 * message so the model still receives the full selection.
 */
export function TranscriptQuoteCard({ node }: TranscriptQuoteCardProps): ReactNode {
  ensureToolbarStyles()
  const quotes = node.data?.quotes ?? []
  if (quotes.length === 0) return null

  return jsx('div', {
    className: styles.tCardStack,
    children: quotes.map((quote, index) =>
      jsx(
        QuoteCardView,
        {
          variant: 'transcript',
          title: quote.title,
          body: quote.body,
        },
        `${index}`,
      ),
    ),
  })
}
