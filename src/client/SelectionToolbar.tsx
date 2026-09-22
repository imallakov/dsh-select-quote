import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { createPortal } from 'react-dom'
import {
  clearNativeSelection,
  copyText,
  readSelectionSnapshot,
  type SelectionSnapshot,
} from './dom/selection.ts'
import { focusComposer } from './dom/composer-host.ts'
import { resolveSessionId, setRuntimeSession } from './runtime.ts'
import { saveAnnotation } from './state/annotation-store.ts'
import { ensureToolbarStyles, styles } from './styles.ts'

export interface SelectionToolbarProps {
  /** Optional when mounted at shell.overlay; falls back to runtime session. */
  sessionId?: string
}

type Phase = 'idle' | 'comment'

/**
 * Frame-wide selection toolbar. Mounted on `shell.overlay` (root scope) so it
 * is always live — a session-scoped composer overlay is not guaranteed to be
 * mounted while the user selects transcript text.
 */
export function SelectionToolbar({ sessionId }: SelectionToolbarProps): ReactNode {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const commentWrapRef = useRef<HTMLDivElement | null>(null)
  const commentRef = useRef<HTMLTextAreaElement | null>(null)
  const [active, setActive] = useState<SelectionSnapshot | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  useEffect(() => {
    ensureToolbarStyles()
  }, [])

  const hide = useCallback(() => {
    setActive(null)
    setPhase('idle')
    setComment('')
    setStatus(null)
  }, [])

  const refresh = useCallback(() => {
    if (phase === 'comment') return
    const next = readSelectionSnapshot(toolbarRef.current)
    setActive((prev) => {
      if (!next) return null
      if (prev && prev.text === next.text && prev.left === next.left && prev.top === next.top) {
        return prev
      }
      return next
    })
  }, [phase])

  useEffect(() => {
    const schedule = () => window.setTimeout(refresh, 0)

    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (toolbarRef.current?.contains(target)) return
      if (commentWrapRef.current?.contains(target)) return
      if (phase === 'comment') return
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        schedule()
        return
      }
      hide()
    }

    // selectionchange catches drag-select and keyboard selection too.
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', schedule, true)
    document.addEventListener('keyup', schedule, true)
    document.addEventListener('selectionchange', schedule)
    window.addEventListener('resize', hide)
    document.addEventListener('scroll', hide, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', schedule, true)
      document.removeEventListener('keyup', schedule, true)
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('resize', hide)
      document.removeEventListener('scroll', hide, true)
    }
  }, [hide, phase, refresh])

  useEffect(() => {
    if (phase === 'comment') commentRef.current?.focus()
  }, [phase])

  const handleToolbarPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleCopy = useCallback(async () => {
    const snapshot = active
    if (!snapshot) return
    try {
      await copyText(snapshot.text)
      clearNativeSelection()
      hide()
    } catch {
      setStatus('复制失败')
    }
  }, [active, hide])

  const openComment = useCallback(() => {
    setPhase('comment')
    setComment('')
    setStatus(null)
  }, [])

  const commitAnnotation = useCallback(
    (body: string | undefined) => {
      const snapshot = active
      const sid = resolveSessionId(sessionRef.current)
      if (!snapshot) return
      // Session id is only used as a store partition; fall back so root mount works.
      saveAnnotation(sid ?? 'default', {
        text: snapshot.text,
        ...(body && body.trim() ? { comment: body.trim() } : {}),
      })
      clearNativeSelection()
      hide()
      window.setTimeout(focusComposer, 16)
    },
    [active, hide],
  )

  // Keep the shared session in sync when the owner passes one.
  useEffect(() => {
    if (sessionId) setRuntimeSession(sessionId)
  }, [sessionId])

  if (!active) return null

  const toolbarStyle: CSSProperties = { left: active.left, top: active.top }

  return createPortal(
    jsxs(Fragment, {
      children: [
        jsx('div', {
          ref: toolbarRef,
          className: styles.toolbar,
          style: toolbarStyle,
          role: 'toolbar',
          'aria-label': '划词操作',
          'data-dsq-toolbar': 'true',
          onPointerDown: handleToolbarPointerDown,
          children:
            phase === 'comment'
              ? jsx('div', {
                  style: { display: 'inline-flex', alignItems: 'center', gap: 2 },
                  children: jsx('span', {
                    style: { padding: '0 8px', fontSize: 13, opacity: 0.8 },
                    children: '添加批注…',
                  }),
                })
              : jsxs('div', {
                  style: { display: 'inline-flex', alignItems: 'center', gap: 2 },
                  children: [
                    jsx('button', {
                      type: 'button',
                      className: styles.button,
                      onClick: () => void handleCopy(),
                      children: '复制',
                    }),
                    jsx('span', { className: styles.divider, 'aria-hidden': true }),
                    jsx('button', {
                      type: 'button',
                      className: styles.button,
                      onClick: openComment,
                      children: '添加到任务',
                    }),
                  ],
                }),
        }),
        phase === 'comment'
          ? jsxs('div', {
              ref: commentWrapRef,
              className: styles.commentPop,
              style: {
                left: active.left,
                top: active.top + 36,
              },
              role: 'dialog',
              'aria-label': '添加可选评论',
              onPointerDown: handleToolbarPointerDown,
              children: [
                jsx('textarea', {
                  ref: commentRef,
                  className: styles.commentInput,
                  placeholder: '添加可选评论…',
                  value: comment,
                  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value),
                  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      hide()
                      return
                    }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      commitAnnotation(comment)
                    }
                  },
                }),
                jsxs('div', {
                  className: styles.commentActions,
                  children: [
                    jsx('button', {
                      type: 'button',
                      className: styles.button,
                      onClick: () => commitAnnotation(undefined),
                      children: '暂不评论',
                    }),
                    jsx('button', {
                      type: 'button',
                      className: styles.button,
                      disabled: !comment.trim(),
                      onClick: () => commitAnnotation(comment),
                      children: '添加评论',
                    }),
                  ],
                }),
              ],
            })
          : null,
        status
          ? jsx('div', {
              className: styles.status,
              style: toolbarStyle,
              role: 'status',
              children: status,
            })
          : null,
      ],
    }),
    document.body,
  )
}
