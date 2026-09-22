import type { ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { ensureToolbarStyles, styles } from '../styles.ts'
import { AnnotationSummary } from '../ui/AnnotationCardView.tsx'
import type { SelectQuoteNodeData } from './transcript-node.ts'

export interface TranscriptQuoteCardProps {
  node: { data: SelectQuoteNodeData }
}

/**
 * History-side annotation summary — same chrome as the composer
 * (`N 条批注 · 悬停查看批注` + hover list).
 */
export function TranscriptQuoteCard({ node }: TranscriptQuoteCardProps): ReactNode {
  ensureToolbarStyles()
  const quotes = node.data?.quotes ?? []
  if (quotes.length === 0) return null

  return jsx('div', {
    className: styles.tCardStack,
    children: AnnotationSummary({
      count: quotes.length,
      items: quotes.map((quote) => ({
        title: quote.title,
        text: quote.text,
        comment: quote.comment || undefined,
      })),
    }),
  })
}
