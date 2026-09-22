import type { ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { ensureToolbarStyles, styles } from '../styles.ts'
import { AnnotationCardView } from '../ui/AnnotationCardView.tsx'
import type { SelectQuoteNodeData } from './transcript-node.ts'

export interface TranscriptQuoteCardProps {
  node: { data: SelectQuoteNodeData }
}

export function TranscriptQuoteCard({ node }: TranscriptQuoteCardProps): ReactNode {
  ensureToolbarStyles()
  const quotes = node.data?.quotes ?? []
  if (quotes.length === 0) return null

  return jsx('div', {
    className: styles.tCardStack,
    children: quotes.map((quote, index) =>
      jsx(
        AnnotationCardView,
        {
          variant: 'transcript',
          index: index + 1,
          title: quote.title,
          text: quote.text,
          comment: quote.comment || undefined,
        },
        `${index}`,
      ),
    ),
  })
}
