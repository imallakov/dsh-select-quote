import { useCallback, type ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { scrollToAnnotation } from '../dom/scrollToAnnotation.ts'
import { ensureToolbarStyles, styles } from '../styles.ts'
import {
  AnnotationSummary,
  type AnnotationSummaryItem,
} from '../ui/AnnotationCardView.tsx'
import type { SelectQuoteNodeData } from './transcript-node.ts'

export interface TranscriptQuoteCardProps {
  node: { data: SelectQuoteNodeData }
}

/** History-side annotation summary — same chrome as the composer. */
export function TranscriptQuoteCard({ node }: TranscriptQuoteCardProps): ReactNode {
  ensureToolbarStyles()
  const quotes = node.data?.quotes ?? []

  const onItemSelect = useCallback((index: number, item: AnnotationSummaryItem) => {
    scrollToAnnotation(index, item.text)
  }, [])

  if (quotes.length === 0) return null

  return jsx('div', {
    className: styles.tCardStack,
    children: [
      ...quotes.map((_quote, index) =>
        jsx(
          'span',
          {
            className: styles.annAnchor,
            'data-dsq-ann-index': String(index),
          },
          `ann-${index}`,
        ),
      ),
      AnnotationSummary({
        count: quotes.length,
        items: quotes.map((quote) => ({
          title: quote.title,
          text: quote.text,
          comment: quote.comment || undefined,
        })),
        onItemSelect,
      }),
    ],
  })
}
