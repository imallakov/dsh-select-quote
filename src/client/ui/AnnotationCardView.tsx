import type { ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { styles } from '../styles.ts'

export interface AnnotationCardViewProps {
  readonly title: string
  /** Full selected text (tooltip / hover body). */
  readonly text: string
  readonly comment?: string
  readonly variant: 'composer' | 'transcript'
  /** Optional index label (1-based), Qoder style. */
  readonly index?: number
  readonly onRemove?: () => void
  readonly onEditComment?: () => void
}

/**
 * Shared selection-annotation chrome: icon + title + “选中的文本”/评论摘要
 * (+ composer remove / edit).
 */
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

export interface AnnotationSummaryProps {
  readonly count: number
  readonly items: readonly { title: string; text: string; comment?: string }[]
  readonly onRemoveAll?: () => void
  readonly hint?: string
}

/** Qoder-style composer summary: “N 条批注 · 悬停查看批注”. */
export function AnnotationSummary({
  count,
  items,
  onRemoveAll,
  hint = '悬停查看批注',
}: AnnotationSummaryProps): ReactNode {
  return jsxs('div', {
    className: styles.summary,
    tabIndex: 0,
    'data-selection-annotation-summary': 'true',
    'aria-label': `${count} 条划词批注。悬停查看详情。`,
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
            className: styles.summaryHover,
            children: items.map((item, i) =>
              jsxs(
                'div',
                {
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
                },
                `${i}`,
              ),
            ),
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
