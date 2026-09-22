import { useEffect, type MutableRefObject } from 'react'
import { composerCardOf, willSubmit } from '../dom/composer-host.ts'
import { composeSubmission } from '../protocol/quote-protocol.ts'
import { clearQuotes, getQuotes } from '../state/quote-store.ts'

export interface SendInterceptDeps {
  /** Non-zero enables the intercept for this session. */
  readonly quoteCount: number
  readonly sessionId: string | undefined
  readonly draftRef: MutableRefObject<string>
  readonly setDraft: (text: string) => void
  /** Clear pending quote cards after they were folded into the draft. */
  readonly onFolded: () => void
}

/**
 * Fold every quote into the draft at the send gesture: Enter (without
 * modifiers, outside IME composition) inside the composer editor, or the
 * composer's own primary action. Both are intercepted on `document` in the
 * capture phase, so the draft already carries the blocks when the composer
 * submits it, and the cards disappear at the same moment.
 */
export function useSendIntercept({
  quoteCount,
  sessionId,
  draftRef,
  setDraft,
  onFolded,
}: SendInterceptDeps): void {
  useEffect(() => {
    const id = sessionId
    if (quoteCount === 0 || !id) return

    const inject = (): void => {
      // Read the live store at the send gesture, not a stale render snapshot.
      const current = getQuotes(id)
      if (current.length === 0) return
      const blocks = current.map((quote) => quote.draftBlock)
      setDraft(composeSubmission(draftRef.current, blocks))
      clearQuotes(id)
      onFolded()
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey)
        return
      if (event.isComposing) return
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.isContentEditable) return
      const card = composerCardOf(target)
      if (!card || !willSubmit(card, draftRef.current)) return
      inject()
    }

    const onClick = (event: MouseEvent): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      const card = composerCardOf(target)
      if (!card) return
      // A disabled primary means the composer itself has nothing to send.
      const button = target.closest('button')
      if (!button || (button as HTMLButtonElement).disabled) return
      // The composer's primary seat is its last button; it renders the stop
      // control (a filled square) instead of submit while a turn runs.
      const buttons = card.querySelectorAll('button')
      if (buttons.length === 0 || buttons[buttons.length - 1] !== button) return
      if (button.querySelector('svg rect') !== null) return
      inject()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [quoteCount, sessionId, draftRef, setDraft, onFolded])
}
