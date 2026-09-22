import { useEffect, type MutableRefObject } from 'react'
import { composerCardOf, willSubmit } from '../dom/composer-host.ts'
import { composeAnnotatedMessage } from '../protocol/annotation-protocol.ts'
import { clearAnnotations, getAnnotations } from '../state/annotation-store.ts'

export interface SendInterceptDeps {
  readonly itemCount: number
  readonly sessionId: string | undefined
  readonly draftRef: MutableRefObject<string>
  readonly setDraft: (text: string) => void
  readonly onFolded: () => void
}

/**
 * Fold pending annotations into the draft at the send gesture (Enter in the
 * composer, or the primary send button) so the composer's submit path carries
 * the JSON protocol block.
 */
export function useSendIntercept({
  itemCount,
  sessionId,
  draftRef,
  setDraft,
  onFolded,
}: SendInterceptDeps): void {
  useEffect(() => {
    const id = sessionId
    if (itemCount === 0 || !id) return

    const inject = (): void => {
      const current = getAnnotations(id)
      if (current.length === 0) return
      setDraft(composeAnnotatedMessage(draftRef.current, current))
      clearAnnotations(id)
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
      const button = target.closest('button')
      if (!button || (button as HTMLButtonElement).disabled) return
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
  }, [itemCount, sessionId, draftRef, setDraft, onFolded])
}
