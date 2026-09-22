/**
 * Scroll the conversation to one annotation: prefer its transcript anchor,
 * then a DOM node that still contains the selected text.
 */
export function scrollToAnnotation(index: number, text: string): void {
  const anchor = document.querySelector(`[data-dsq-ann-index="${index}"]`)
  if (anchor instanceof HTMLElement) {
    anchor.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return
  }
  const byText = findElementByText(text)
  if (byText) {
    byText.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

function findElementByText(text: string): HTMLElement | null {
  const needle = text.trim().slice(0, 32)
  if (needle.length < 2) return null
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let best: HTMLElement | null = null
  let bestScore = 0
  while (walker.nextNode()) {
    const node = walker.currentNode
    const value = node.textContent ?? ''
    if (!value.includes(needle)) continue
    const el = node.parentElement
    if (!el || el.closest('[data-dsq-toolbar], [data-selection-annotation-summary]')) continue
    // Prefer the deepest reasonably sized block.
    const score = value.length < 500 ? 2 : 1
    if (score > bestScore) {
      best = el
      bestScore = score
      if (score === 2) break
    }
  }
  return best
}
