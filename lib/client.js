window.__ModuleLoader__.load({
	id: "dsh-select-quote",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
let react_dom = require("react-dom");
//#region src/client/dom/composer-host.ts
/**
* Host DOM contract for the resident composer.
*
* These selectors track the running dsh Web Client. Keep every assumption
* about composer geometry / send affordances in this file.
*/
/** The resident composer card that owns the draft surface. */
const COMPOSER_CARD = "[data-composer-card]";
function composerCardOf(node) {
	const card = node.closest(COMPOSER_CARD);
	return card instanceof HTMLElement ? card : null;
}
/**
* A composer card is non-empty when it holds visible draft text or a draft
* attachment — the two states in which the composer's own send gesture
* actually submits.
*/
function willSubmit(card, draft) {
	return draft.trim().length > 0 || card.querySelector("img") !== null;
}
/** Focus the resident composer editor and park the caret at the end. */
function focusComposer() {
	const editor = document.querySelector("[data-lexical-editor=\"true\"]") ?? document.querySelector("[contenteditable=\"true\"][data-lexical-editor]") ?? lastEditable();
	if (!editor) return;
	editor.focus({ preventScroll: false });
	const selection = window.getSelection();
	if (!selection) return;
	const range = document.createRange();
	range.selectNodeContents(editor);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
}
function lastEditable() {
	const nodes = document.querySelectorAll("[contenteditable=\"true\"]");
	for (let i = nodes.length - 1; i >= 0; i -= 1) {
		const node = nodes[i];
		if (node instanceof HTMLElement && !node.closest("[data-dsq-toolbar]")) return node;
	}
	return null;
}
const DRAFT_MARKER_RE = /\u200B/g;
/** Plain text from Chat user-node content blocks (string or block array). */
function contentBlocksToText(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.map((block) => {
		if (block && typeof block === "object" && "text" in block) {
			const text = block.text;
			return typeof text === "string" ? text : "";
		}
		return "";
	}).join("");
}
/**
* Best-effort plain text from a durable `user/message` event. A surface event
* carries its blocks directly on `data.content`; `data.message.content` is only
* a fallback for the older shape.
*/
function extractUserText(event) {
	const data = event?.data;
	if (!data) return "";
	return contentBlocksToText(data.content ?? data.message?.content);
}
/** Short one-line card title from selected body text. */
function previewTitle(text, max = 48) {
	const oneLine = text.replace(/\s+/g, " ").trim();
	return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
/**
* Markdown blockquote of the selection — what the model should read.
* `[选中文本]` marks the block as plugin-injected (not a hand-typed quote).
*/
function formatQuoteBlock(text) {
	return `> [选中文本]\n${text.split("\n").map((line) => line.length > 0 ? `> ${line}` : ">").join("\n")}`;
}
/** Ensure the draft carries the invisible marker, without disturbing its text. */
function withDraftMarker(draft) {
	return draft.includes("​") ? draft : `${draft}​`;
}
/** Remove every invisible marker from a draft. */
function stripDraftMarker(draft) {
	return draft.split("​").join("");
}
/**
* Fold every pending quote block into the draft. Called only at the send
* gesture, so the composer never displays the markdown while the user types.
*/
function composeSubmission(draft, quoteBlocks) {
	const rest = stripDraftMarker(draft).replace(/^\s+/, "");
	const prefix = quoteBlocks.filter((block) => block.length > 0).join("\n\n");
	if (prefix === "") return rest;
	if (quoteBlocks.every((block) => rest.includes(block))) return rest;
	return rest ? `${prefix}\n\n${rest}` : `${prefix}\n\n`;
}
function toQuote(body) {
	const text = body.join("\n").trim();
	if (!text) return null;
	return {
		title: previewTitle(text),
		body: text
	};
}
/**
* Single-pass reader for plugin quote blocks. Yields both the parsed quotes
* and the leftover display text (question / non-quote lines).
*/
function scanQuoteMessage(text) {
	const quotes = [];
	const restLines = [];
	let body = null;
	const close = () => {
		if (body === null) return;
		const quote = toQuote(body);
		if (quote) quotes.push(quote);
		body = null;
	};
	for (const line of text.split("\n")) {
		const trimmed = line.trimEnd();
		const isMarker = trimmed === "> [选中文本]" || trimmed.startsWith("> [选中文本]");
		if (body === null) {
			if (isMarker) body = [];
			else restLines.push(line);
			continue;
		}
		if (trimmed.startsWith(">")) {
			body.push(trimmed.replace(/^>\s?/, ""));
			continue;
		}
		close();
		if (isMarker) body = [];
		else restLines.push(line);
	}
	close();
	return {
		quotes,
		rest: restLines.join("\n").replace(/^\n+/, "").trim()
	};
}
/** Detect every quote block in a durable message. Empty means none. */
function parseQuoteMessage(text) {
	if (!text.includes("> [选中文本]")) return [];
	return scanQuoteMessage(text).quotes;
}
/**
* Display text for a user bubble: drop every plugin quote block so the
* transcript shows only the question. The durable message (and model payload)
* still contains the full `> [选中文本]` text.
*/
function displayTextWithoutQuote(text) {
	const clean = text.replace(DRAFT_MARKER_RE, "");
	if (!clean.includes("> [选中文本]")) return clean;
	return scanQuoteMessage(clean).rest;
}
//#endregion
//#region src/client/state/quote-store.ts
/** Per-session pending quote cards (composer-side store). */
const EMPTY_QUOTES = [];
const bySession = /* @__PURE__ */ new Map();
const listeners = /* @__PURE__ */ new Set();
function notify() {
	for (const listener of [...listeners]) listener();
}
/** Observe store changes (save / remove / clear). Returns the unsubscribe callback. */
function subscribeQuotes(listener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
/** Append one selection as a quote card; an identical pending quote is reused. */
function saveQuote(sessionId, text) {
	const draftBlock = formatQuoteBlock(text);
	const current = bySession.get(sessionId) ?? EMPTY_QUOTES;
	const duplicate = current.find((quote) => quote.draftBlock === draftBlock);
	if (duplicate) return duplicate;
	const quote = {
		id: `sq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
		text,
		body: text,
		title: previewTitle(text),
		draftBlock
	};
	bySession.set(sessionId, [...current, quote]);
	notify();
	return quote;
}
function getQuotes(sessionId) {
	return bySession.get(sessionId) ?? EMPTY_QUOTES;
}
function removeQuote(sessionId, id) {
	const current = bySession.get(sessionId);
	if (!current) return;
	const next = current.filter((quote) => quote.id !== id);
	if (next.length === current.length) return;
	if (next.length === 0) bySession.delete(sessionId);
	else bySession.set(sessionId, next);
	notify();
}
function clearQuotes(sessionId) {
	if (bySession.delete(sessionId)) notify();
}
//#endregion
//#region src/client/styles.ts
const CSS = `
.dsq_toolbar {
  position: fixed;
  z-index: 10000;
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
  z-index: 10001;
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

/* Quote card row — floats inside the composer card (input.overlay layer).
   Cards fill left to right and wrap onto the next line. */
.dsq_cardStack {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 40;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  pointer-events: none;
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

/* Transcript cards — in-flow Chat node (conversation history), stacked. */
.dsq_tCardStack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  margin: 4px 0 8px;
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
`;
const TAG_ID = "dsh-select-quote/toolbar.css";
function ensureToolbarStyles() {
	if (typeof document === "undefined") return;
	if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`)) return;
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-select-quote";
	tag.dataset.pluginCss = TAG_ID;
	tag.textContent = CSS;
	document.head.appendChild(tag);
}
const styles = {
	toolbar: "dsq_toolbar",
	button: "dsq_button",
	divider: "dsq_divider",
	status: "dsq_status",
	cardStack: "dsq_cardStack",
	card: "dsq_card",
	cardIcon: "dsq_cardIcon",
	cardBody: "dsq_cardBody",
	cardTitle: "dsq_cardTitle",
	cardSubtitle: "dsq_cardSubtitle",
	cardClose: "dsq_cardClose",
	cardPad: "dsq_cardPad",
	tCardStack: "dsq_tCardStack",
	tCard: "dsq_tCard",
	tCardIcon: "dsq_tCardIcon",
	tCardBody: "dsq_tCardBody",
	tCardTitle: "dsq_tCardTitle",
	tCardSubtitle: "dsq_tCardSubtitle",
	userRow: "dsq_userRow",
	userStack: "dsq_userStack",
	userImages: "dsq_userImages",
	userBubble: "dsq_userBubble"
};
//#endregion
//#region src/client/ui/QuoteCardView.tsx
/** Shared quote card chrome: icon + title + “选中的文本” (+ optional close). */
function QuoteCardView({ title, body, variant, onRemove }) {
	const composer = variant === "composer";
	return (0, react_jsx_runtime.jsxs)("div", {
		className: composer ? styles.card : styles.tCard,
		role: "group",
		"aria-label": "选中的文本",
		children: [
			(0, react_jsx_runtime.jsx)("div", {
				className: composer ? styles.cardIcon : styles.tCardIcon,
				"aria-hidden": true,
				children: "AI"
			}),
			(0, react_jsx_runtime.jsxs)("div", {
				className: composer ? styles.cardBody : styles.tCardBody,
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: composer ? styles.cardTitle : styles.tCardTitle,
					title: body,
					children: title
				}), (0, react_jsx_runtime.jsx)("div", {
					className: composer ? styles.cardSubtitle : styles.tCardSubtitle,
					children: "选中的文本"
				})]
			}),
			composer && onRemove ? (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: styles.cardClose,
				"aria-label": "移除引用",
				onClick: onRemove,
				children: "×"
			}) : null
		]
	});
}
//#endregion
//#region src/client/composer/useDraftMarker.ts
/**
* Keep the composer's own send button usable while only quotes are pending:
* an invisible marker makes an otherwise empty draft non-empty.
*
* Written ONCE per quote-list change — never on a draft change. Rewriting the
* editor in response to the draft fights the user: backspacing through the
* marker would immediately restore it (so deletion looks broken), and an
* in-flight IME composition would be destroyed mid-keystroke.
*/
function useDraftMarker({ quoteCount, sessionId, draftRef, setDraft }) {
	(0, react.useEffect)(() => {
		if (quoteCount === 0 || !sessionId) return;
		const current = draftRef.current;
		if (current.includes("​")) return;
		if (current.trim() !== "") return;
		setDraft(withDraftMarker(current));
	}, [
		quoteCount,
		sessionId,
		draftRef,
		setDraft
	]);
}
/** Drop the invisible send marker (e.g. when the last quote card is removed). */
function clearDraftMarker(draft, setDraft) {
	if (!draft.includes("​")) return;
	setDraft(stripDraftMarker(draft));
}
//#endregion
//#region src/client/composer/useSendIntercept.ts
/**
* Fold every quote into the draft at the send gesture: Enter (without
* modifiers, outside IME composition) inside the composer editor, or the
* composer's own primary action. Both are intercepted on `document` in the
* capture phase, so the draft already carries the blocks when the composer
* submits it, and the cards disappear at the same moment.
*/
function useSendIntercept({ quoteCount, sessionId, draftRef, setDraft, onFolded }) {
	(0, react.useEffect)(() => {
		const id = sessionId;
		if (quoteCount === 0 || !id) return;
		const inject = () => {
			const current = getQuotes(id);
			if (current.length === 0) return;
			const blocks = current.map((quote) => quote.draftBlock);
			setDraft(composeSubmission(draftRef.current, blocks));
			clearQuotes(id);
			onFolded();
		};
		const onKeyDown = (event) => {
			if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
			if (event.isComposing) return;
			const target = event.target;
			if (!(target instanceof HTMLElement) || !target.isContentEditable) return;
			const card = composerCardOf(target);
			if (!card || !willSubmit(card, draftRef.current)) return;
			inject();
		};
		const onClick = (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const card = composerCardOf(target);
			if (!card) return;
			const button = target.closest("button");
			if (!button || button.disabled) return;
			const buttons = card.querySelectorAll("button");
			if (buttons.length === 0 || buttons[buttons.length - 1] !== button) return;
			if (button.querySelector("svg rect") !== null) return;
			inject();
		};
		document.addEventListener("keydown", onKeyDown, true);
		document.addEventListener("click", onClick, true);
		return () => {
			document.removeEventListener("keydown", onKeyDown, true);
			document.removeEventListener("click", onClick, true);
		};
	}, [
		quoteCount,
		sessionId,
		draftRef,
		setDraft,
		onFolded
	]);
}
//#endregion
//#region src/client/composer/QuoteCard.tsx
const NO_QUOTES = [];
/**
* Composer quote card stack (`conversation.input.overlay`).
*
* Selections never enter the editor as text: the cards are the only thing the
* user sees, and the markdown blocks are folded into the draft one capture-phase
* step before the composer's own send handler reads it.
*/
function QuoteCard({ useInput, inputActions, sessionId }) {
	const draft = useInput((state) => state.draft);
	const [quotes, setQuotes] = (0, react.useState)(NO_QUOTES);
	const stackRef = (0, react.useRef)(null);
	const draftRef = (0, react.useRef)(draft);
	const actionsRef = (0, react.useRef)(inputActions);
	const sessionRef = (0, react.useRef)(sessionId);
	draftRef.current = draft;
	actionsRef.current = inputActions;
	sessionRef.current = sessionId;
	const setDraft = (0, react.useCallback)((text) => {
		actionsRef.current.setDraft(text);
	}, []);
	const sync = (0, react.useCallback)(() => {
		const id = sessionRef.current;
		setQuotes(id ? getQuotes(id) : NO_QUOTES);
	}, []);
	const onFolded = (0, react.useCallback)(() => {
		setQuotes(NO_QUOTES);
	}, []);
	(0, react.useEffect)(() => {
		ensureToolbarStyles();
		sync();
		return subscribeQuotes(sync);
	}, [sync, sessionId]);
	(0, react.useEffect)(() => {
		const element = stackRef.current;
		if (!element) return;
		const card = composerCardOf(element);
		if (!card) return;
		const apply = () => {
			card.style.setProperty("--dsq-quote-pad", `${element.offsetHeight + 20}px`);
		};
		card.classList.add(styles.cardPad);
		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(element);
		return () => {
			observer.disconnect();
			card.classList.remove(styles.cardPad);
			card.style.removeProperty("--dsq-quote-pad");
		};
	}, [quotes]);
	useDraftMarker({
		quoteCount: quotes.length,
		sessionId,
		draftRef,
		setDraft
	});
	useSendIntercept({
		quoteCount: quotes.length,
		sessionId,
		draftRef,
		setDraft,
		onFolded
	});
	const onRemove = (0, react.useCallback)((id) => {
		const active = sessionRef.current;
		if (!active) return;
		removeQuote(active, id);
		const rest = getQuotes(active);
		setQuotes(rest);
		if (rest.length === 0) clearDraftMarker(draftRef.current, setDraft);
	}, [setDraft]);
	if (!sessionId || quotes.length === 0) return null;
	return (0, react_jsx_runtime.jsx)("div", {
		ref: stackRef,
		className: styles.cardStack,
		children: quotes.map((quote) => (0, react_jsx_runtime.jsx)(QuoteCardView, {
			variant: "composer",
			title: quote.title,
			body: quote.text,
			onRemove: () => onRemove(quote.id)
		}, quote.id))
	});
}
//#endregion
//#region src/client/dom/selection.ts
const TOOLBAR_OFFSET = 12;
const VIEWPORT_MARGIN = 12;
const LINE_TOP_TOLERANCE = 3;
/** Contenteditable roots that must never host the selection toolbar. */
function isInsideEditable(node) {
	let current = node;
	while (current) {
		if (current instanceof HTMLElement) {
			if (current.isContentEditable) return true;
			if (current.getAttribute("role") === "textbox") return true;
		}
		current = current.parentNode;
	}
	return false;
}
function mergeRects(rects) {
	const left = Math.min(...rects.map((rect) => rect.left));
	const right = Math.max(...rects.map((rect) => rect.right));
	const top = Math.min(...rects.map((rect) => rect.top));
	const bottom = Math.max(...rects.map((rect) => rect.bottom));
	return DOMRect.fromRect({
		height: bottom - top,
		width: right - left,
		x: left,
		y: top
	});
}
function getRangeFirstLineRect(range) {
	const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
	if (rects.length === 0) {
		const rect = range.getBoundingClientRect();
		return rect.width > 0 || rect.height > 0 ? rect : void 0;
	}
	const firstTop = Math.min(...rects.map((rect) => rect.top));
	return mergeRects(rects.filter((rect) => Math.abs(rect.top - firstTop) <= LINE_TOP_TOLERANCE));
}
function toolbarPosition(rect) {
	const center = rect.left + rect.width / 2;
	return {
		left: Math.min(Math.max(center, VIEWPORT_MARGIN), window.innerWidth - VIEWPORT_MARGIN),
		top: Math.max(rect.top - TOOLBAR_OFFSET, VIEWPORT_MARGIN)
	};
}
/**
* Read the live selection when it is a non-empty, non-editable range.
* Conversation-area coverage: any selectable text outside the composer.
*/
function readSelectionSnapshot(toolbarRoot) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
	const { anchorNode, focusNode } = selection;
	if (!anchorNode || !focusNode) return null;
	if (isInsideEditable(anchorNode) || isInsideEditable(focusNode)) return null;
	if (toolbarRoot?.contains(anchorNode) || toolbarRoot?.contains(focusNode)) return null;
	const text = selection.toString().replace(/\r\n/g, "\n").trim();
	if (!text) return null;
	const rect = getRangeFirstLineRect(selection.getRangeAt(0));
	if (!rect) return null;
	const { left, top } = toolbarPosition(rect);
	return {
		text,
		left,
		top
	};
}
function clearNativeSelection() {
	window.getSelection()?.removeAllRanges();
}
async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const area = document.createElement("textarea");
	area.value = text;
	area.setAttribute("readonly", "");
	area.style.position = "fixed";
	area.style.left = "-9999px";
	document.body.appendChild(area);
	area.select();
	document.execCommand("copy");
	area.remove();
}
//#endregion
//#region src/client/SelectionToolbar.tsx
function SelectionToolbar({ sessionId }) {
	const toolbarRef = (0, react.useRef)(null);
	const [active, setActive] = (0, react.useState)(null);
	const [status, setStatus] = (0, react.useState)(null);
	const sessionRef = (0, react.useRef)(sessionId);
	sessionRef.current = sessionId;
	(0, react.useEffect)(() => {
		ensureToolbarStyles();
	}, []);
	const hide = (0, react.useCallback)(() => {
		setActive(null);
		setStatus(null);
	}, []);
	const refresh = (0, react.useCallback)(() => {
		const next = readSelectionSnapshot(toolbarRef.current);
		setActive((prev) => {
			if (!next) return null;
			if (prev && prev.text === next.text && prev.left === next.left && prev.top === next.top) return prev;
			return next;
		});
	}, []);
	(0, react.useEffect)(() => {
		const schedule = () => {
			window.setTimeout(refresh, 0);
		};
		const onPointerDown = (event) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (toolbarRef.current?.contains(target)) return;
			const selection = window.getSelection();
			if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
				schedule();
				return;
			}
			hide();
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("pointerup", schedule, true);
		document.addEventListener("keyup", schedule, true);
		window.addEventListener("resize", hide);
		document.addEventListener("scroll", hide, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("pointerup", schedule, true);
			document.removeEventListener("keyup", schedule, true);
			window.removeEventListener("resize", hide);
			document.removeEventListener("scroll", hide, true);
		};
	}, [hide, refresh]);
	const handleToolbarPointerDown = (0, react.useCallback)((event) => {
		event.preventDefault();
		event.stopPropagation();
	}, []);
	const handleCopy = (0, react.useCallback)(async () => {
		const snapshot = active;
		if (!snapshot) return;
		try {
			await copyText(snapshot.text);
			clearNativeSelection();
			setActive(null);
			setStatus(null);
		} catch {
			setStatus("复制失败");
		}
	}, [active]);
	const handleAddToTask = (0, react.useCallback)(() => {
		const snapshot = active;
		if (!snapshot) return;
		const sid = sessionRef.current;
		if (!sid) {
			setStatus("会话未就绪");
			return;
		}
		saveQuote(sid, snapshot.text);
		clearNativeSelection();
		setActive(null);
		setStatus(null);
		window.setTimeout(focusComposer, 16);
	}, [active]);
	if (!active) return null;
	const toolbarStyle = {
		left: active.left,
		top: active.top
	};
	return (0, react_dom.createPortal)((0, react_jsx_runtime.jsxs)(react.Fragment, { children: [(0, react_jsx_runtime.jsx)("div", {
		ref: toolbarRef,
		className: styles.toolbar,
		style: toolbarStyle,
		role: "toolbar",
		"aria-label": "划词操作",
		"data-dsq-toolbar": "true",
		onPointerDown: handleToolbarPointerDown,
		children: (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "inline-flex",
				alignItems: "center",
				gap: 2
			},
			children: [
				(0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: styles.button,
					onClick: () => void handleCopy(),
					children: "复制"
				}),
				(0, react_jsx_runtime.jsx)("span", {
					className: styles.divider,
					"aria-hidden": true
				}),
				(0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: styles.button,
					onClick: handleAddToTask,
					children: "添加到任务"
				})
			]
		})
	}), status ? (0, react_jsx_runtime.jsx)("div", {
		className: styles.status,
		style: toolbarStyle,
		role: "status",
		children: status
	}) : null] }), document.body);
}
//#endregion
//#region src/client/transcript/TranscriptQuoteCard.tsx
/**
* Transcript cards for the plugin-injected quotes of one user message.
* Renders in the Chat node list; the same text remains in the durable
* message so the model still receives the full selection.
*/
function TranscriptQuoteCard({ node }) {
	ensureToolbarStyles();
	const quotes = node.data?.quotes ?? [];
	if (quotes.length === 0) return null;
	return (0, react_jsx_runtime.jsx)("div", {
		className: styles.tCardStack,
		children: quotes.map((quote, index) => (0, react_jsx_runtime.jsx)(QuoteCardView, {
			variant: "transcript",
			title: quote.title,
			body: quote.body
		}, `${index}`))
	});
}
//#endregion
//#region src/client/transcript/UserMessageDisplay.tsx
/**
* Image blocks carried by one durable user message, in the shape the
* attachment presentation slot renders (`{ attachment }`).
*/
function contentImages(content) {
	if (!Array.isArray(content)) return [];
	const images = [];
	for (const block of content) {
		if (block === null || typeof block !== "object") continue;
		const candidate = block;
		if (candidate.type !== "image" || candidate.attachment === void 0) continue;
		images.push({ attachment: candidate.attachment });
	}
	return images;
}
/**
* Replacement for the built-in `user` Chat node view.
*
* Hides the plugin `> [选中文本]` block in the bubble (the transcript card
* already shows it) while still rendering the message's durable images — a
* quote-only message has no visible text at all, so the images are the only
* thing left to show.
*/
function UserMessageDisplay({ node, renderMessageImages }) {
	ensureToolbarStyles();
	const text = displayTextWithoutQuote(contentBlocksToText(node.data?.content)).trim();
	const images = contentImages(node.data?.content);
	if (!text && images.length === 0) return null;
	return (0, react_jsx_runtime.jsx)("div", {
		className: styles.userRow,
		children: (0, react_jsx_runtime.jsxs)("div", {
			className: styles.userStack,
			children: [images.length > 0 && renderMessageImages !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
				className: styles.userImages,
				"data-message-attachments": true,
				children: renderMessageImages({
					images,
					align: "end",
					compact: images.length > 1
				})
			}, "images") : null, text ? (0, react_jsx_runtime.jsx)("div", {
				className: styles.userBubble,
				children: text
			}, "bubble") : null]
		})
	});
}
//#endregion
//#region src/client/transcript/transcript-node.ts
const KIND = "select-quote";
/**
* Conversation Definition: one durable `user/message` that carries plugin quote
* blocks becomes a `select-quote` Chat node (rendered as a card per quote).
*/
function createSelectQuoteDefinition() {
	return {
		kind: KIND,
		target: "chat",
		match(event) {
			if (event.type !== "user/message") return null;
			if (parseQuoteMessage(extractUserText(event)).length === 0) return null;
			return {
				id: `${KIND}-${event.seq ?? 0}`,
				role: "start"
			};
		},
		start(_context, match) {
			const quotes = parseQuoteMessage(extractUserText(match.event));
			if (quotes.length === 0) throw new Error("select-quote: missing quote payload on start");
			return {
				quotes,
				seq: match.event.seq ?? 0
			};
		},
		update(context) {
			return context.state;
		},
		buildViewNode(context) {
			if (context.state === void 0) return null;
			const anchor = context.start?.event.seq ?? context.matches?.[0]?.event.seq ?? context.state.seq ?? 0;
			const location = context.start?.location ?? context.matches?.[0]?.location ?? { kind: "unresolved" };
			return {
				key: context.key,
				kind: KIND,
				id: context.id,
				target: "chat",
				anchorSeq: anchor,
				location,
				visibility: "visible",
				data: context.state
			};
		}
	};
}
function registerSelectQuoteNode(ctx) {
	const uiConversation = ctx.uiConversation;
	if (!uiConversation) {
		console.warn("[dsh-select-quote] uiConversation unavailable; transcript card disabled");
		return;
	}
	ctx.effect(() => uiConversation.events.register(createSelectQuoteDefinition()), "dsh-select-quote: conversation node definition");
}
//#endregion
//#region src/client/index.tsx
/**
* Browser half of dsh-select-quote.
*
* - Floating selection toolbar (copy / add-to-task)
* - Composer quote cards + `>` fold-at-send (model payload)
* - Transcript Chat node cards + quote-stripped user bubbles
*/
const inject = [
	"slots",
	"sessions",
	"uiConversation"
];
function apply(ctx) {
	ensureToolbarStyles();
	registerSelectQuoteNode(ctx);
	ctx.slots.inject("conversation.input.overlay", () => {
		ctx.slots.register({
			name: "conversation.input.overlay",
			id: "select-quote-toolbar",
			order: 100
		}, SelectionToolbar);
		ctx.slots.register({
			name: "conversation.input.overlay",
			id: "select-quote-card",
			order: 20
		}, QuoteCard);
	});
	ctx.slots.inject("conversation.chat.node", () => {
		ctx.slots.register({
			name: "conversation.chat.node",
			key: "select-quote"
		}, TranscriptQuoteCard);
		ctx.slots.register({
			name: "conversation.chat.node",
			key: "user",
			priority: -10
		}, UserMessageDisplay);
	});
}
//#endregion
exports.apply = apply;
exports.inject = inject;

		return module.exports;
	}
});
