import { useCallback, useRef, useState, type ReactNode } from 'react'
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
  readonly id?: string
  readonly title: string
  readonly text: string
  readonly comment?: string
}

export interface AnnotationSummaryProps {
  readonly count: number
  readonly items: readonly AnnotationSummaryItem[]
  readonly onRemoveAll?: () => void
  readonly onItemSelect?: (index: number, item: AnnotationSummaryItem) => void
  /** Composer only: remove one pending annotation. */
  readonly onItemRemove?: (index: number, item: AnnotationSummaryItem) => void
  /** Composer only: edit one pending annotation comment. */
  readonly onItemEdit?: (index: number, item: AnnotationSummaryItem) => void
  readonly hint?: string
}

/**
 * Qoder-style summary with a placement-aware hover list.
 * Open/close is React state so the panel hides when the pointer leaves.
 */
export function AnnotationSummary({
  count,
  items,
  onRemoveAll,
  onItemSelect,
  onItemRemove,
  onItemEdit,
  hint = '悬停查看批注',
}: AnnotationSummaryProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const place = useCallback(() => {
    const root = rootRef.current
    const pop = popRef.current
    if (!root || !pop) return
    const anchor = root.getBoundingClientRect()
    const panel = { width: pop.offsetWidth || 280, height: pop.offsetHeight || 220 }
    const { top, left, side } = placePopover(anchor, panel, 'bottom')
    pop.style.top = `${top}px`
    pop.style.left = `${left}px`
    pop.dataset.side = side
  }, [])

  const openPop = useCallback(() => {
    setOpen(true)
  }, [])

  const closePop = useCallback(() => {
    setOpen(false)
  }, [])

  // Place after open so measurement sees the real panel.
  const onPointerEnter = useCallback(() => {
    openPop()
    window.requestAnimationFrame(() => place())
  }, [openPop, place])

  // Close when the pointer leaves the whole summary + popover cluster.
  const onPointerLeave = useCallback(
    (e: { relatedTarget: Node | null }) => {
      const next = e.relatedTarget
      if (next instanceof Node && rootRef.current?.contains(next)) return
      closePop()
    },
    [closePop],
  )

  return jsxs('div', {
    ref: rootRef,
    className: styles.summary,
    tabIndex: 0,
    'data-selection-annotation-summary': 'true',
    'aria-label': `${count} 条划词批注。悬停查看详情。`,
    onPointerEnter,
    onPointerLeave,
    onFocus: onPointerEnter,
    onBlur: closePop,
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
          open
            ? jsx('div', {
                ref: popRef,
                className: `${styles.summaryHover} ${styles.summaryHoverOpen}`,
                children: jsx('div', {
                  className: styles.summaryHoverInner,
                  children: items.map((item, i) =>
                    jsxs(
                      'div',
                      {
                        className: styles.summaryItem,
                        children: [
                          jsxs(
                            'button',
                            {
                              type: 'button',
                              className: styles.summaryItemButton,
                              onClick: () => onItemSelect?.(i, item),
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
                            },
                          ),
                          onItemRemove || onItemEdit
                            ? jsxs('div', {
                                className: styles.summaryItemActions,
                                children: [
                                  onItemEdit
                                    ? jsx('button', {
                                        type: 'button',
                                        className: styles.summaryItemAction,
                                        'aria-label': `编辑批注 ${i + 1}`,
                                        onClick: () => onItemEdit(i, item),
                                        children: '✎',
                                      })
                                    : null,
                                  onItemRemove
                                    ? jsx('button', {
                                        type: 'button',
                                        className: styles.summaryItemAction,
                                        'aria-label': `移除批注 ${i + 1}`,
                                        onClick: () => onItemRemove(i, item),
                                        children: '×',
                                      })
                                    : null,
                                ],
                              })
                            : null,
                        ],
                      },
                      item.id ?? `${i}`,
                    ),
                  ),
                }),
              })
            : null,
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
