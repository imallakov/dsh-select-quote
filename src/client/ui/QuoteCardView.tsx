import type { ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { styles } from '../styles.ts'

export interface QuoteCardViewProps {
  /** Short display title. */
  readonly title: string
  /** Full selected text (tooltip). */
  readonly body: string
  /** Visual family: composer overlay card vs in-transcript card. */
  readonly variant: 'composer' | 'transcript'
  /** Corner remove control (composer cards only). */
  readonly onRemove?: () => void
}

/** Shared quote card chrome: icon + title + “选中的文本” (+ optional close). */
export function QuoteCardView({
  title,
  body,
  variant,
  onRemove,
}: QuoteCardViewProps): ReactNode {
  const composer = variant === 'composer'
  return jsxs('div', {
    className: composer ? styles.card : styles.tCard,
    role: 'group',
    'aria-label': '选中的文本',
    children: [
      jsx('div', {
        className: composer ? styles.cardIcon : styles.tCardIcon,
        'aria-hidden': true,
        children: 'AI',
      }),
      jsxs('div', {
        className: composer ? styles.cardBody : styles.tCardBody,
        children: [
          jsx('div', {
            className: composer ? styles.cardTitle : styles.tCardTitle,
            title: body,
            children: title,
          }),
          jsx('div', {
            className: composer ? styles.cardSubtitle : styles.tCardSubtitle,
            children: '选中的文本',
          }),
        ],
      }),
      composer && onRemove
        ? jsx('button', {
            type: 'button',
            className: styles.cardClose,
            'aria-label': '移除引用',
            onClick: onRemove,
            children: '×',
          })
        : null,
    ],
  })
}
