const CSS = `
.dsq_toolbar {
  position: fixed;
  z-index: 10060;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  /* 无边框：--dsw-elevation-soft 自带 0 0 0 .5px 的描边环，由它勾勒轮廓，
     所以这里不要再画 border，否则描边会和环叠成两条线。 */
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2, #fff);
  box-shadow: var(--dsw-elevation-soft, 0 1px 2px rgba(0, 0, 0, 0.03), 0 6px 20px rgba(0, 0, 0, 0.06));
  pointer-events: auto;
}

.dsq_button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  border-radius: 999px;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.dsq_button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
}

.dsq_button:focus-visible {
  outline: 2px solid var(--dsw-alias-button-primary-fill, #1677ff);
  outline-offset: 1px;
}

.dsq_divider {
  width: 1px;
  height: 14px;
  background: var(--dsw-alias-border-l4, rgba(0, 0, 0, 0.12));
  margin: 0 2px;
}

.dsq_status {
  position: fixed;
  z-index: 10061;
  transform: translate(-50%, 8px);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-3, rgba(0, 0, 0, 0.78));
  color: var(--dsw-alias-label-primary-inverted, #fff);
  font-size: 12px;
  line-height: 18px;
  pointer-events: none;
  white-space: nowrap;
}

/* Annotation stack — inside the composer card (input.overlay), ~1/5 width. */
.dsq_cardStack {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 40;
  width: 20%;
  min-width: 148px;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  pointer-events: auto;
}

/* One quote card. Geometry mirrors the product's own file card
   (.nyYjTG_file in ui-deliverables): hairline border, neutral fill,
   18px radius, fixed 72px row, centered content, background transition. */
.dsq_card {
  --dsq-card-fill: var(--dsw-static-neutral-50, #fafafa);
  --dsq-card-hover: var(--dsw-static-neutral-100, #f5f5f5);
  box-sizing: border-box;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: calc(25% - 5px);
  min-width: 0;
  height: 64px;
  margin: 0;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 18px;
  background: var(--dsq-card-fill);
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  transition: background-color 0.12s;
  position: relative;
  overflow: hidden;
  user-select: none;
  pointer-events: auto;
}

.dsq_card:hover {
  background: var(--dsq-card-hover);
}

/* Scaled down from the reference 48px: the composer card is width-capped at a
   quarter of the input, so 48px would leave no room for the quote text. */
.dsq_cardIcon {
  z-index: 2;
  flex: none;
  width: 36px;
  height: 36px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--dsq-card-fill);
  color: var(--dsw-alias-link, rgba(0, 0, 0, 0.65));
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.dsq_cardBody {
  z-index: 2;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  /* Keeps the ellipsised title clear of the corner remove button. */
  padding-right: 14px;
}

.dsq_cardTitle {
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsq_cardSubtitle {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Corner remove button: hidden until the card is hovered or focused. */
.dsq_cardClose {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 3;
  appearance: none;
  border: none;
  background: transparent;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
  display: grid;
  place-items: center;
  font-size: 14px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s, background-color 0.12s;
}

.dsq_card:hover .dsq_cardClose,
.dsq_card:focus-within .dsq_cardClose {
  opacity: 1;
  pointer-events: auto;
}

.dsq_cardClose:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
}

/* Secondary corner action (edit comment). */
.dsq_cardAction {
  position: absolute;
  top: 4px;
  right: 28px;
  z-index: 3;
  appearance: none;
  border: none;
  background: transparent;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
  display: grid;
  place-items: center;
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s, background-color 0.12s;
}

.dsq_card:hover .dsq_cardAction,
.dsq_card:focus-within .dsq_cardAction {
  opacity: 1;
  pointer-events: auto;
}

.dsq_cardAction:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
}

/* Qoder-style annotation summary (“N 条批注”) inside the composer. */
.dsq_summary {
  position: relative;
  z-index: 10040;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 18px;
  background: var(--dsw-static-neutral-50, #fafafa);
  pointer-events: auto;
  user-select: none;
}

/* Shown only while React state open is true (dsq_summaryHoverOpen). */

.dsq_summaryIcon {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-link, rgba(0, 0, 0, 0.65));
  font-size: 13px;
  font-weight: 600;
}

.dsq_summaryBody {
  flex: 1;
  min-width: 0;
  position: relative;
}

.dsq_summaryTitle {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
}

.dsq_summaryHint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
}

.dsq_summaryHoverOpen {
  display: flex;
}

.dsq_summaryHover {
  display: none;
  position: fixed;
  z-index: 10050;
  width: min(320px, calc(100vw - 16px));
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  padding-top: 20px;
  border-radius: 14px;
  background: transparent;
  pointer-events: auto;
}

.dsq_summaryHoverInner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  background: var(--dsw-specific-menu, #fff);
  box-shadow: var(--dsw-elevation-soft, 0 6px 20px rgba(0, 0, 0, 0.08));
}

.dsq_summaryItemButton {
  appearance: none;
  text-align: left;
  font: inherit;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  padding: 6px 8px;
  margin: 0 -8px;
}

.dsq_summaryItemButton:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
}

.dsq_summaryItemActions {
  display: none;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}

.dsq_summaryItem:hover .dsq_summaryItemActions,
.dsq_summaryItem:focus-within .dsq_summaryItemActions {
  display: flex;
}

.dsq_summaryItemAction {
  appearance: none;
  border: none;
  background: transparent;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
  display: grid;
  place-items: center;
  font-size: 12px;
}

.dsq_summaryItemAction:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
}

.dsq_annAnchor {
  display: block;
  width: 100%;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.dsq_summaryItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
}

.dsq_summaryItem:last-child {
  border-bottom: none;
}

.dsq_summaryItem:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.dsq_summaryItemLabel {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
}

.dsq_summaryItemText {
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Inline comment composer under the floating selection toolbar. */
.dsq_commentPop {
  position: fixed;
  z-index: 10050;
  transform: translate(-50%, 4px);
  width: min(320px, calc(100vw - 24px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 14px;
  background: var(--dsw-specific-menu, #fff);
  box-shadow: var(--dsw-elevation-soft, 0 6px 20px rgba(0, 0, 0, 0.1));
}

.dsq_commentInput {
  width: 100%;
  min-height: 64px;
  resize: none;
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
  outline: none;
}

.dsq_commentInput::placeholder {
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
}

.dsq_commentActions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* Transcript cards — in-flow Chat node (conversation history), stacked. */
.dsq_tCardStack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin: 4px 0 8px;
  /* Match composer summary width; sit on the user-bubble side (right). */
  width: 20%;
  min-width: 148px;
  max-width: 220px;
  margin-left: auto;
  margin-right: 0;
}

.dsq_tCard {
  --dsq-card-fill: var(--dsw-static-neutral-50, #fafafa);
  --dsq-card-hover: var(--dsw-static-neutral-100, #f5f5f5);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: min(calc(var(--dsh-chat-content-width, 748px) * 0.72), 520px);
  min-width: 0;
  height: 64px;
  margin: 0 0 0 auto;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 18px;
  background: var(--dsq-card-fill);
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  transition: background-color 0.12s;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.dsq_tCard:hover {
  background: var(--dsq-card-hover);
}

.dsq_tCardIcon {
  z-index: 2;
  flex: none;
  width: 40px;
  height: 40px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--dsq-card-fill);
  color: var(--dsw-alias-link, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.dsq_tCardBody {
  z-index: 2;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.dsq_tCardTitle {
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsq_tCardSubtitle {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, 0.45));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Replacement user bubble (quote block stripped from display). */
.dsq_userRow {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.dsq_userStack {
  min-width: 0;
  max-width: min(calc(var(--dsh-chat-content-width, 748px) * 0.702), 82%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.dsq_userBubble {
  max-width: 100%;
  padding: 10px 16px;
  border-radius: 22px;
  background: var(--dsw-specific-bubble, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, rgba(0, 0, 0, 0.88));
  font-size: var(--dsh-content-font-size, 14px);
  line-height: calc(22px + var(--dsh-content-font-delta, 0px));
  white-space: pre-wrap;
  word-break: break-word;
}

/* Reserve room for the floating quote cards inside the composer card, so the
   attachment rail and the editor flow below them instead of being covered. */
.dsq_cardPad {
  padding-top: var(--dsq-quote-pad, 88px) !important;
}

/* Durable message images of a replacement user bubble. */
.dsq_userImages {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: 100%;
}

/* Dark theme: the product flips its palette on body[data-ds-dark-theme], and
   every --dsw-alias-* token follows it. Only the card fill is ours. */
body[data-ds-dark-theme] .dsq_card,
body[data-ds-dark-theme] .dsq_tCard {
  --dsq-card-fill: var(--dsw-static-neutral-850, #212123);
  --dsq-card-hover: var(--dsw-static-neutral-800, #292929);
}
`

const TAG_ID = 'dsh-select-quote/toolbar.css'

export function ensureToolbarStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`)) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-select-quote'
  tag.dataset.pluginCss = TAG_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}

export const styles = {
  toolbar: 'dsq_toolbar',
  button: 'dsq_button',
  divider: 'dsq_divider',
  status: 'dsq_status',
  cardStack: 'dsq_cardStack',
  card: 'dsq_card',
  cardIcon: 'dsq_cardIcon',
  cardBody: 'dsq_cardBody',
  cardTitle: 'dsq_cardTitle',
  cardSubtitle: 'dsq_cardSubtitle',
  cardClose: 'dsq_cardClose',
  cardPad: 'dsq_cardPad',
  cardAction: 'dsq_cardAction',
  summary: 'dsq_summary',
  summaryIcon: 'dsq_summaryIcon',
  summaryBody: 'dsq_summaryBody',
  summaryTitle: 'dsq_summaryTitle',
  summaryHint: 'dsq_summaryHint',
  summaryHover: 'dsq_summaryHover',
  summaryItem: 'dsq_summaryItem',
  summaryItemLabel: 'dsq_summaryItemLabel',
  summaryItemText: 'dsq_summaryItemText',
  summaryHoverInner: 'dsq_summaryHoverInner',
  summaryItemButton: 'dsq_summaryItemButton',
  summaryHoverOpen: 'dsq_summaryHoverOpen',
  summaryItemActions: 'dsq_summaryItemActions',
  summaryItemAction: 'dsq_summaryItemAction',
  annAnchor: 'dsq_annAnchor',
  commentPop: 'dsq_commentPop',
  commentInput: 'dsq_commentInput',
  commentActions: 'dsq_commentActions',
  tCardStack: 'dsq_tCardStack',
  tCard: 'dsq_tCard',
  tCardIcon: 'dsq_tCardIcon',
  tCardBody: 'dsq_tCardBody',
  tCardTitle: 'dsq_tCardTitle',
  tCardSubtitle: 'dsq_tCardSubtitle',
  userRow: 'dsq_userRow',
  userStack: 'dsq_userStack',
  userImages: 'dsq_userImages',
  userBubble: 'dsq_userBubble',
} as const
