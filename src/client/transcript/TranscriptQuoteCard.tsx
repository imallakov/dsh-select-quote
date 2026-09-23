import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { jsx } from 'react/jsx-runtime'
import { upsertAnnotationJobs } from '../dom/annotate-text.ts'
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
  const stackRef = useRef<HTMLDivElement | null>(null)
  const quotes = node.data?.quotes ?? []

  // Mark the annotated text inside the source messages. The mark id embeds
  // this message's own flow key so quotes from different turns never collide.
  useEffect(() => {
    if (quotes.length === 0) return
    const ownerKey = stackRef.current?.closest('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
    upsertAnnotationJobs(
      quotes.map((quote, index) => ({
        markId: ownerKey ? `dqsm_${ownerKey}_${index}` : `dqsm_q${index}`,
        messageId: quote.messageId ?? '',
        index: index + 1,
        text: quote.text,
        startOffset: quote.startOffset,
        endOffset: quote.endOffset,
      })),
    )
  }, [quotes])

  const onItemSelect = useCallback((index: number, item: AnnotationSummaryItem) => {
    scrollToAnnotation(index + 1, item.text, item.id)
  }, [])

  const markIdOf = useCallback((index: number): string | undefined => {
    const ownerKey = stackRef.current?.closest('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
    return ownerKey ? `dqsm_${ownerKey}_${index}` : undefined
  }, [])

  if (quotes.length === 0) return null

  return jsx('div', {
    ref: stackRef,
    className: styles.tCardStack,
    'data-dsq-deco': 'true',
    children: jsx(AnnotationSummary, {
      count: quotes.length,
      items: quotes.map((quote, index) => ({
        id: markIdOf(index),
        title: quote.title,
        text: quote.text,
        comment: quote.comment || undefined,
      })),
      onItemSelect,
    }),
  })
}
