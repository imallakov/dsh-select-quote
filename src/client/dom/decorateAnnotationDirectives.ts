/**
 * Turn model-written `:dsh-annotation{index="N"}` into clickable chips.
 * Display-only decoration — durable message text is never rewritten.
 */

import { ANNOTATION_DIRECTIVE_RE } from '../protocol/annotation-protocol.ts'
import { scrollToAnnotation } from './scrollToAnnotation.ts'

const DECO = 'dsq-ann-directive'

function decorateTextNode(node: Text): void {
  const value = node.nodeValue
  if (!value || !value.includes(':dsh-annotation{')) return
  const parent = node.parentElement
  if (!parent || parent.closest(`[data-${DECO}]`)) return
  // Skip code/pre so directives in examples stay literal.
  if (parent.closest('pre, code, [data-dsq-toolbar]')) return

  const frag = document.createDocumentFragment()
  let last = 0
  const re = new RegExp(ANNOTATION_DIRECTIVE_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) frag.append(document.createTextNode(value.slice(last, m.index)))
    const index = Number(m[1])
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'dsq_annDirective'
    chip.dataset[DECO] = String(index)
    chip.textContent = `批注 ${index}`
    chip.addEventListener('click', () => {
      const item = { text: chip.title || `批注 ${index}` }
      scrollToAnnotation(index - 1, item.text)
    })
    frag.append(chip)
    last = m.index + m[0].length
  }
  if (last < value.length) frag.append(document.createTextNode(value.slice(last)))
  parent.replaceChild(frag, node)
}

/** Decorate all matching text nodes under root. Safe to call repeatedly. */
export function decorateAnnotationDirectives(root?: ParentNode): void {
  const el = root ?? (typeof document === 'undefined' ? undefined : document.body)
  if (!el) return
  root = el

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const hits: Text[] = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node instanceof Text && node.nodeValue?.includes(':dsh-annotation{')) hits.push(node)
  }
  for (const node of hits) decorateTextNode(node)
}

/** Observe chat DOM and decorate new directive text. Returns disposer. */
export function watchAnnotationDirectives(root?: ParentNode): () => void {
  const el = root ?? (typeof document === 'undefined' ? undefined : document.body)
  if (!el || typeof MutationObserver === 'undefined') return () => {}
  decorateAnnotationDirectives(el)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Text) decorateTextNode(node)
        else if (node instanceof Element) decorateAnnotationDirectives(node)
      }
    }
  })
  observer.observe(el, { childList: true, subtree: true, characterData: true })
  return () => observer.disconnect()
}
