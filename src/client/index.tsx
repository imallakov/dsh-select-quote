import type { Context } from '@deepseek-ai/cordis'
import { QuoteCard } from './composer/AnnotationPanel.tsx'
import { SelectionToolbar } from './SelectionToolbar.tsx'
import { TranscriptQuoteCard } from './transcript/TranscriptQuoteCard.tsx'
import { UserMessageDisplay } from './transcript/UserMessageDisplay.tsx'
import { ensureToolbarStyles } from './styles.ts'
import { registerSelectQuoteNode } from './transcript/transcript-node.ts'

/**
 * Browser half of dsh-select-quote.
 *
 * - Floating selection toolbar (copy / add annotation + optional comment)
 * - Composer annotation summary (“N 条批注”)
 * - Send folds a `<response-annotations>` JSON block into the message
 * - Transcript cards + quote-stripped user bubbles
 */
export const inject = ['slots', 'sessions', 'uiConversation']

export function apply(ctx: Context): void {
  ensureToolbarStyles()
  registerSelectQuoteNode(ctx)

  ctx.slots.inject('conversation.input.overlay', () => {
    ctx.slots.register(
      {
        name: 'conversation.input.overlay',
        id: 'select-quote-toolbar',
        order: 100,
      },
      SelectionToolbar,
    )
    ctx.slots.register(
      {
        name: 'conversation.input.overlay',
        id: 'select-quote-card',
        order: 20,
      },
      QuoteCard,
    )
  })

  ctx.slots.inject('conversation.chat.node', () => {
    ctx.slots.register(
      {
        name: 'conversation.chat.node',
        key: 'select-quote',
      },
      TranscriptQuoteCard,
    )
    ctx.slots.register(
      {
        name: 'conversation.chat.node',
        key: 'user',
        priority: -10,
      },
      UserMessageDisplay,
    )
  })
}
