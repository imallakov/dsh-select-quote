/**
 * Host DOM contract for the resident composer.
 *
 * These selectors track the running dsh Web Client. Keep every assumption
 * about composer geometry / send affordances in this file.
 */

/** The resident composer card that owns the draft surface. */
export const COMPOSER_CARD = '[data-composer-card]'

export function composerCardOf(node: Element): HTMLElement | null {
  const card = node.closest(COMPOSER_CARD)
  return card instanceof HTMLElement ? card : null
}

/**
 * A composer card is non-empty when it holds visible draft text or a draft
 * attachment — the two states in which the composer's own send gesture
 * actually submits.
 */
export function willSubmit(card: HTMLElement, draft: string): boolean {
  return draft.trim().length > 0 || card.querySelector('img') !== null
}

/** Focus the resident composer editor and park the caret at the end. */
export function focusComposer(): void {
  const editor =
    document.querySelector<HTMLElement>('[data-lexical-editor="true"]') ??
    document.querySelector<HTMLElement>('[contenteditable="true"][data-lexical-editor]') ??
    lastEditable()
  if (!editor) return
  editor.focus({ preventScroll: false })
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function lastEditable(): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>('[contenteditable="true"]')
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i]
    if (node instanceof HTMLElement && !node.closest('[data-dsq-toolbar]')) return node
  }
  return null
}
