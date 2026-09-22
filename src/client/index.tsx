import type { Context } from '@deepseek-ai/cordis'
import { QuoteCard } from './composer/QuoteCard.tsx'
import { SelectionToolbar } from './SelectionToolbar.tsx'
import { TranscriptQuoteCard } from './transcript/TranscriptQuoteCard.tsx'
import { UserMessageDisplay } from './transcript/UserMessageDisplay.tsx'
import { ensureToolbarStyles } from './styles.ts'
import { registerSelectQuoteNode } from './transcript/transcript-node.ts'

/**
 * Browser half of dsh-select-quote.
 *
 * - Floating selection toolbar (copy / add-to-task)
 * - Composer quote cards + `>` fold-at-send (model payload)
 * - Transcript Chat node cards + quote-stripped user bubbles
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

  // Transcript card + user-bubble replacement (strip quote from display).
  ctx.slots.inject('conversation.chat.node', () => {
    ctx.slots.register(
      {
        name: 'conversation.chat.node',
        key: 'select-quote',
      },
      TranscriptQuoteCard,
    )
    // Replace user bubble so `> [选中文本]` stays out of the UI.
    // Built-in sits at 0; other plugins may use -1. Lowest priority wins.
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
