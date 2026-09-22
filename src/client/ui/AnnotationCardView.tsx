import { useCallback, useRef, type ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { placePopover } from '../dom/popoverPlacement.ts'
import { styles } from '../styles.ts'

export interface AnnotationCardViewProps {
  readonly title: string
  readonly text: string
  readonly comment?: string
  readonly variant: 'composer' | 'transcript'
  readonly index?: number
  readonly onRemove?: () => void
  readonly onEditComment?: () => void
}

export function AnnotationCardView({
  title,
  text,
  comment,
  variant,
  index,
  onRemove,
  onEditComment,
}: AnnotationCardViewProps): ReactNode {
  const composer = variant === 'composer'
  const subtitle = comment ? `评论 · ${comment}` : '选中的文本'
  return jsxs('div', {
    className: composer ? styles.card : styles.tCard,
    role: 'group',
    'aria-label': index ? `批注 ${index}` : '划词批注',
    children: [
      jsx('div', {
        className: composer ? styles.cardIcon : styles.tCardIcon,
        'aria-hidden': true,
        children: index ? String(index) : 'AI',
      }),
      jsxs('div', {
        className: composer ? styles.cardBody : styles.tCardBody,
        children: [
          jsx('div', {
            className: composer ? styles.cardTitle : styles.tCardTitle,
            title: text,
            children: title,
          }),
          jsx('div', {
            className: composer ? styles.cardSubtitle : styles.tCardSubtitle,
            children: subtitle,
          }),
        ],
      }),
      composer && onEditComment
        ? jsx('button', {
            type: 'button',
            className: styles.cardAction,
            'aria-label': '编辑评论',
            onClick: onEditComment,
            children: '✎',
          })
        : null,
      composer && onRemove
        ? jsx('button', {
            type: 'button',
            className: styles.cardClose,
            'aria-label': '移除批注',
            onClick: onRemove,
            children: '×',
          })
        : null,
    ],
  })
}

export interface AnnotationSummaryItem {
  readonly title: string
  readonly text: string
  readonly comment?: string
}

export interface AnnotationSummaryProps {
  readonly count: number
  readonly items: readonly AnnotationSummaryItem[]
  readonly onRemoveAll?: () => void
  readonly onItemSelect?: (index: number, item: AnnotationSummaryItem) => void
  readonly hint?: string
}

/** Qoder-style summary with a placement-aware hover list. */
export function AnnotationSummary({
  count,
  items,
  onRemoveAll,
  onItemSelect,
  hint = '悬停查看批注',
}: AnnotationSummaryProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  const place = useCallback(() => {
    const root = rootRef.current
    const pop = popRef.current
    if (!root || !pop) return
    const anchor = root.getBoundingClientRect()
    // Measure with the class toggled open so layout is real.
    pop.style.display = 'flex'
    pop.style.visibility = 'hidden'
    const panel = {
      width: pop.offsetWidth || 280,
      height: pop.offsetHeight || 220,
    }
    pop.style.visibility = ''
    const { top, left, side } = placePopover(anchor, panel, 'bottom')
    // Position relative to the summary root (which is position: relative).
    const originTop = anchor.top + (root.offsetParent ? root.offsetTop : 0)
    // Prefer viewport-fixed coordinates converted to offset-parent space.
    pop.style.position = 'fixed'
    pop.style.top = `${top}px`
    pop.style.left = `${left}px`
    pop.style.right = 'auto'
    pop.dataset.side = side
  }, [])

  const openPop = useCallback(() => {
    place()
  }, [place])

  return jsxs('div', {
    ref: rootRef,
    className: styles.summary,
    tabIndex: 0,
    'data-selection-annotation-summary': 'true',
    'aria-label': `${count} 条划词批注。悬停查看详情。`,
    onPointerEnter: openPop,
    onFocus: openPop,
    children: [
      jsx('div', {
        className: styles.summaryIcon,
        'aria-hidden': true,
        children: String(count),
      }),
      jsxs('div', {
        className: styles.summaryBody,
        children: [
          jsx('div', {
            className: styles.summaryTitle,
            children: `${count} 条批注`,
          }),
          jsx('div', {
            className: styles.summaryHint,
            children: hint,
          }),
          jsx('div', {
            ref: popRef,
            className: styles.summaryHover,
            children: jsx('div', {
              className: styles.summaryHoverInner,
              children: items.map((item, i) =>
                jsxs(
                  'button',
                  {
                    type: 'button',
                    className: styles.summaryItemButton,
                    onClick: (e: { stopPropagation: () => void }) => {
                      e.stopPropagation()
                      onItemSelect?.(i, item)
                    },
                    children: [
                      jsxs('div', {
                        className: styles.summaryItem,
                        children: [
                          jsx('div', {
                            className: styles.summaryItemLabel,
                            children: `${i + 1}. 选中文字`,
                          }),
                          jsx('div', {
                            className: styles.summaryItemText,
                            children: item.title,
                          }),
                          jsx('div', {
                            className: styles.summaryItemLabel,
                            children: '用户评论',
                          }),
                          jsx('div', {
                            className: styles.summaryItemText,
                            children: item.comment || '未添加评论',
                          }),
                        ],
                      }),
                    ],
                  },
                  `${i}`,
                ),
              ),
            }),
          }),
        ],
      }),
      onRemoveAll
        ? jsx('button', {
            type: 'button',
            className: styles.cardClose,
            'aria-label': '移除全部划词批注',
            onClick: onRemoveAll,
            children: '×',
          })
        : null,
    ],
  })
}
