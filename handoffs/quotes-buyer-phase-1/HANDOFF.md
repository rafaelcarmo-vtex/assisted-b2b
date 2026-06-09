# B2B Order Entry — Prototype Handoff

> Status: high-fidelity prototype for handoff to engineering.
> Scope: simulates the buyer experience for assisted order entry, line item
> management, delivery setup, payment, totals and the quote-request flow.
> The prototype is built as a single-page React app (`App.tsx`) with Vite +
> Tailwind. Behaviour is fully interactive but state is in-memory only and
> backend calls are mocked.

This document covers what this version of the app is intended to do, the
logic and behaviour developers should preserve, and the open questions /
extensions that the next iteration must address.

---

## 1. Purpose & UX model

The page is a **chat-driven order builder**. The user talks to an AI agent
(left panel) to build a structured order (right panel = "canvas"). Almost
every block of the canvas is selectable; clicking a block adds a context
"pill" to the chat composer so the user's next message is scoped to that
piece of the order.

There are two main authoring modes that share the same canvas:

| Mode | Trigger | Visual cue |
|---|---|---|
| Empty order | Default | Title `PO06032026-0011`, sections render in "Add"/empty state |
| Filled order | After `Import` of a file in the chat | Same title, but the Items section is populated with 10 products and the Delivery section gets two delivery rows |
| Pending quote | After confirming a quote request | Title flips to `QR06032026-0011`, amber alert below it, extra summary rows (`Sales Rep`, `Status`, `Requested`, `Expires on`) |

---

## 2. Top-level layout

```
<div class="h-screen flex">
  <aside w=60>            ← left rail (icons / menu)
  <section flex-1>        ← chat panel (Composer + thread)
  <section w=66.6667vw>   ← order canvas (relative; header overlays)
    <header absolute>     ← transparent header (download button only)
    <main panel-scroll>   ← scrollable order content (pt-[60px])
    <footer>              ← items count + Order total + CTAs
  </section>
</div>
```

Key decisions:

- The **canvas header is `position: absolute`** with `pointer-events-none`
  except for its inner controls. Content scrolls underneath it, so the
  buyer never sees order data being hidden behind a white bar.
- The **canvas main has `pt-[60px]`** so the title is not initially under
  the floating header.
- The **canvas footer is a flex sibling** of `<main>` (not floating). It is
  hidden during the file-import "Filling out order" loading.

---

## 3. Order canvas sections

All sections live inside `<main>` and are spaced by **60px** (vertical gap).
When a quote is pending, the Title block uses **32px gap** internally
(title → alert → first row).

### 3.1 Title

- `PO06032026-0011` in Inter Semibold / 32px / `letter-spacing -4%`.
- Becomes `QR06032026-0011` when `isQuotePending`.

### 3.2 Pending-quote alert (only when `isQuotePending`)

- Amber pill `bg #FFF1DC`, `rounded-[8px]`, `px-4 py-3`, `gap-4`.
- Icon: Material Symbol `report` (filled, diamond shape), color `#E29911`.
- Copy: *"This order includes a pending quote request. Any changes to its
  content will immediately revoke the quote."*
- Right side: a single `×` button bound to `setIsQuoteAlertDismissed(true)`.
  The alert never returns automatically after dismiss.

### 3.3 Summary

Rows are 48px tall (token `--order-row-height`), 20px lateral padding (via
`.order-row-height`), each separated by a 1px `#EBEBEB` divider.

Row composition:

- Label column: `200px` shrink-0, Inter Semibold 14 `#1F1F1F`.
- Value column: Inter Medium 14 `#1F1F1F` (or the Edit link in empty state).

Rows shown by default:

1. **Contract** — avatar pill + name from `sessionContext.contractName`.
2. **Buyer** — avatar pill + `sessionContext.userName`.
3. **Sales Rep** — `Unassigned` (italic, `#ADADAD`). **Only when quote is pending.**
4. **Status** — `● Pending quote` (dot `#E29911`). **Quote only.**
5. **Requested** — static label `Apr 28, 2026 - 10:42`. **Quote only.**
6. **Expires on** — `May 12, 2026 (in 2 weeks)`. **Quote only.**
7. **Last update** — `Oct 14, 2025 - 10:42` (or `Apr 28, 2026 - 10:42` when
   quote is pending).
8. **Promo code** — `OFFICEWEEK2026` when filled, else `Edit` link.
9. **PO Number** — `PO-01937981739826492` when filled, else `Edit` link.
10. **Comments** — *Replenishment requested to restore standard office supply
    stock levels for Q1 2026, …* Defaults to **expanded** (full text + `Show
    less`). Clicking `Show less` collapses to a single line with ellipsis +
    `Show more`. The collapsed cell uses a single-line layout with
    `truncate`; the expanded cell expands the row to `min-h-12` and adds
    `py-3` vertical padding.

### 3.4 Items

Header includes the section title plus a count (in light grey `#ADADAD`,
always — even when filled) and `Subtotal $X` on the right.

Empty state: 240px-tall block with `No items yet` + `Import` link. The
`Import` link triggers the chat composer's file input (same code path as
drag-and-drop / paperclip).

Filled state:

- Table header: `Line item details` | `Quantity` (100px right) | `Unit price`
  (100px right) | `Subtotal` (100px right). Header row uses
  `order-row-height` (no hover / no selection).
- Each line is an `<article>` with `p-5 gap-3 border-b #EBEBEB`. Hover bg
  `#f8f8f8` (`.canvas-card-hover`).
  - Thumbnail 48×48 with hue-rotate filter per index.
  - Name (Medium 14) + SKU (Regular 14 `#707070`).
  - Quantity is a **pill picker** (`-` / value / `+`). Picker has its own
    `event.stopPropagation()` so it never selects the row. Minimum value
    enforced at 1; subtotal recalculates dynamically.
  - Meta lines under the title (`pl-[68px]`):
    - Ship-to or pickup line, format always matches the Delivery section
      (`Ship to: Boston Boylston · Standard shipping` or `Pickup: Springfield
      Store · Express shipping`). The mapping is computed from the product's
      `shipTo` field via `getProductDeliveryRowId`.
    - Accounting line `POSL01 · R&D · Finance & Operations` with an optional
      `+N` chip in `#0366DD` indicating hidden extra fields.
- Pagination control (only when `FILLED_PRODUCTS.length > 5`): a single text
  link, left-aligned with the divider edge (no horizontal padding).
  - `Show 5 more line items` when collapsed.
  - `Show less line items` when expanded.

### 3.5 Delivery

Header includes `Delivery` + `Subtotal $X` on the right.

Empty state shows two rows (`Ship to`, `Pickup`) with `Edit` links for
Address and Option. Option's `Edit` is **disabled** until the Address is
set (`renderDeliveryAddButton(!!shipToDeliveryAddress, …)`); we keep the
state but do not auto-fill on click — clicking Edit only updates the chat
composer context.

Filled state shows the same two rows but populated, structurally aligned
with the Figma node `2718:5119`:

- Column widths: 200 / 200 / 200 / 100 / 100.
- Method (Medium 14 `#1F1F1F`).
- Address column: stack of sub-blocks separated by `gap-4`.
  - Sub-block 1: title (Medium 14) + 4 address lines (Regular 14).
  - Sub-block 2: destination code (only on the Ship to row).
  - Sub-block 3: contact name + phone (only on the Ship to row).
- Option column: shipping type (Medium 14) + ETA label + ETA value (both
  `#707070`).
- Items column: count from `deliveryItemsCountByRowId[row.id]` (always
  matches the global `filledProductsCount`).
- Subtotal column: shipping fee; `$0.00` renders in grey (Regular), positive
  values in dark (Medium).

### 3.6 Payment

- **Payment method** row: when filled, renders five stacked lines (method /
  owner / masked card / expiration / cardholder) from `FILLED_SUMMARY_DATA`.
  Empty state shows `Edit` link.
- **Billing address** row: title in semibold + 4 address lines in medium.
  Empty state shows `Edit` link.
- Both rows use `p-5 items-start` when filled (multi-line layout with 20px
  padding all sides). When empty they stay at single-row height
  (`order-row-height`).

### 3.7 Order totals

- Single-column right-aligned values.
- Subtotal / Shipping / Taxes / Total.
- Divider above `Total` is `#000` (others `#EBEBEB`).
- Total value uses Inter Semibold 20 / letter-spacing -4%.

### 3.8 Footer

- Left: `Items <count>` and `Order total <orderTotalLabel>` (uses the full
  total = subtotal + shipping + taxes).
- Right: `Request quote` (secondary pill) + `Go to Checkout` (primary pill,
  trailing `arrow_forward` icon).

---

## 4. Selection model & chat context

Every clickable row in the canvas can become the **active context** for the
next chat message. Source of truth: `selectedCanvasElement: { id, label }`,
plus row-level selection sets `selectedItemRowIds[]` and
`selectedDeliveryRowIds[]`.

Behaviour:

- Single click toggles: clicking a selected element again clears it
  (`handleCanvasElementSelect` + the early-return guards in
  `handleItemRowClick` / `handleDeliveryRowClick`).
- Cmd/Ctrl + click and Shift + click extend or reduce multi-selection on
  the Items and Delivery tables.
- Whenever a selection is set, the chat composer shows a **pill** with a
  human-readable label (`selectedReferenceLabel`). Removing the pill clears
  the selection.
- Clicking an `Edit` link **does not change canvas data**. It only sets the
  selection AND updates the chat composer's placeholder to UX-appropriate
  copy (e.g. `Enter a promo code for this order…`).

Visual treatment for selected rows:

- Selectable summary rows / payment rows / order totals rows: solid background
  `#E1F3FF` via `.canvas-card-active`.
- Items and Delivery rows: an absolutely-positioned overlay `<div>` with
  `.table-selection-fill` (`background-color: #E1F3FF; mix-blend-mode:
  multiply;`). The multiply blend ensures text and thumbnails remain
  legible. **No blue stroke.**

---

## 5. Chat flows

State lives in `chatMessages: ChatMessage[]`. Each message has a `role`
(`user` / `agent-thinking` / `agent`) and, for agent messages, an
`agentType` discriminating the visual block.

### 5.1 File-driven order fill

1. User uploads file (paperclip, drag-drop, or `Import` link in empty
   Items).
2. The composer keeps the file attached until the user adds a question and
   sends.
3. Agent shows a thinking bubble + a footer-replaced **"Filling out order"**
   progress bar with a `Cancel` action. Duration:
   `FILLING_OUT_ORDER_DURATION_MS = 8000`.
4. On completion: `hasFilledProducts = true` and the Items / Delivery
   sections render filled.

### 5.2 Request quote

1. User clicks **Request quote** in the footer.
2. The button reuses `handleAddFieldClick('request-quote', 'Request quote',
   …)` → pill in chat composer + placeholder *"Add any details or terms for
   your quote request…"*.
3. When the user sends a non-empty message:
   - Agent posts a `quote-preparation` thinking bubble (1.4s).
   - Agent posts the **quote confirmation** message (`agentType:
     'quote-request'`) with the dynamic item count and a semibold
     `Shall I go ahead and submit the request?` CTA at the bottom.
   - **No canvas pulse** during this step.
4. When the user replies to that question with any text:
   - Agent posts a `quote-submission` thinking bubble (4.5s).
   - During this thinking the **canvas pulses opacity** (1 → 0.3 → 1, 2s
     cycle, `ease-in-out`, infinite). Implemented via
     `.canvas-thinking-pulse` and `isQuoteProcessing` flag. The canvas
     receives `pointer-events: none` to block clicks while pulsing.
   - On completion:
     - Agent posts the **quote-submitted** card (see 5.3).
     - `isQuotePending = true` (transforms the canvas — see 3.2 / 3.3).
     - The canvas auto-scrolls back to top via `canvasScrollRef.current
       ?.scrollTo({ top: 0, behavior: 'smooth' })`.

### 5.3 Quote-submitted card

Rendered inside the chat thread:

```
Your quote request has been successfully submitted.

┌──────────────────────────────────────────────────┐
│ Quote request                       ● Pending    │
│ ───────────────────────────────────────────────  │
│ 112 items · $33,663.29                           │
│ Submitted 21 May 2026 02h15 PM                   │
│ Expected response within 2 business days         │
└──────────────────────────────────────────────────┘

Go to quotes
Continue shopping
```

- Card: white, rounded 12, border `#E0E0E0`, `p-5` with the internal divider
  extended to the card edges via `-mx-5`.
- Status indicator is amber `#E29911` (same colour token as the Status row
  in the Summary).
- The bottom CTAs are simple text links (Edit-style), left-aligned in a
  vertical stack.

---

## 6. Animations & micro-interactions

| Feature | Implementation |
|---|---|
| Chat message appearance | `.chat-message-appear` keyframe (opacity + translateY 6px, 220ms) |
| New product rows reveal | `.product-row-appear` keyframe (opacity + translateY 4px, 240ms) on the IDs added by `handleShowMoreProducts` |
| Show less collapse | `.product-row-disappear` keyframe (opacity 1→0 + translateY 0→-12px, 240ms). After 240ms, `flushSync(() => setVisibleProductCount(5))` + an immediate **anchor correction** that adjusts `scrollPanel.scrollTop` so the "Show less" button stays on the exact same pixel of the viewport. |
| Quote-submission canvas pulse | `.canvas-thinking-pulse` keyframe (opacity 1→0.3→1, 2s, infinite). Only active during `quote-submission` thinking. |
| Quote completion scroll | Smooth scroll back to top of `canvasScrollRef`. |
| Selection state hover | `.canvas-card-hover:hover` adds `#f8f8f8` only when the row is neither active nor table-row-selected. |

`flushSync` is used to guarantee that the DOM has committed before
measuring `getBoundingClientRect`, so anchor offsets are correct.

---

## 7. Data model (in-memory)

Constants in `App.tsx`:

- `FILLED_PRODUCTS: ProductLineItem[]` — 10 items, distributed across the
  two delivery rows by `getProductDeliveryRowId`.
- `FILLED_DELIVERY_ROWS: DeliveryLine[]` — 2 rows (`Ship to` / `Pickup`).
  Items column is derived dynamically and is no longer read from the row.
- `FILLED_SUMMARY_DATA: SummaryFillData` — payment + billing data.
- `FILLED_ACCOUNTING_FIELDS` — promo code, PO number, comments used in the
  filled summary.
- `QUOTE_REQUESTED_AT_LABEL`, `QUOTE_EXPIRES_ON_LABEL`,
  `QUOTE_EXPIRES_ON_SUFFIX`, `QUOTE_LAST_UPDATE_LABEL`, `QUOTE_ORDER_TITLE`.

Calculations (recomputed on every render — all consistent across the UI):

- `filledProductsCount = Σ getProductQuantity(item)` (respects the picker).
- `productsSubtotalValue = Σ unitPrice × getProductQuantity(item)`.
- `deliverySubtotalValue = Σ row.subtotal` (static shipping fees).
- `taxesValue = (productsSubtotal + deliverySubtotal) × TAX_RATE` where
  `TAX_RATE = 0.23`.
- `orderTotalValue = productsSubtotal + deliverySubtotal + taxes`.

All "$0.00" branches and number displays use the same accessors, so the
Items section header, the Items column inside Delivery, the Order totals
section, the footer, and the Quote card always show consistent values.

---

## 8. Design tokens & shared utilities

- `--order-row-height: 48px` (defined in `index.html`) — drives all
  single-line rows via the helper class `.order-row-height` (height,
  min-height, `padding-left/right: 20px`).
- `ORDER_ROW_HEADER_CLASS` / `ORDER_ROW_HEIGHT_CLASS` — exported from
  `designTokens.ts` for shared usage.
- Section title typography: `text-[24px]/[28.8px] tracking-[-0.04em]
  font-semibold #1F1F1F`.
- Order title typography: `text-[32px]/[38.4px] tracking-[-0.04em]
  font-semibold #1F1F1F`.
- Total typography: `text-[20px]/[24px] tracking-[-0.04em] font-semibold`.
- Primary action color `#0366DD`; hover `opacity-80`.
- Secondary muted grey `#707070`; placeholder grey `#ADADAD`.
- Amber accent `#E29911`; amber bg `#FFF1DC`.
- Selection bg `#E1F3FF`.

---

## 9. Known limitations & future considerations

The prototype is intentionally optimistic about happy paths. The next
iteration should look at:

1. **Persistence & real services.** All state lives in memory. Wire the
   order canvas to the actual order service, the chat to the LLM service,
   and the quote flow to the quotes service. Replace static constants
   (`FILLED_PRODUCTS`, `FILLED_DELIVERY_ROWS`, etc.) with API responses.
2. **Quote-pending immutability.** Today the canvas still allows
   interactions during a pending quote. The amber alert promises the
   opposite (*"Any changes will immediately revoke the quote"*). Decide
   whether to:
   - Disable all editing affordances while pending; or
   - Allow editing and trigger an explicit quote-revoke confirmation flow.
3. **Selection beyond visual feedback.** The chat composer just shows a
   pill; the agent has no contract yet for how to act on the selection.
   Define the API for scoped messages (e.g. attach the selected IDs in the
   request payload).
4. **Edit links are stateless.** Clicking `Edit` only updates the placeholder;
   it never auto-fills the field. The submission path that turns a chat
   message into a structured field update is out of scope.
5. **Picker quantity bounds.** Lower bound is 1; there is no upper bound or
   stock-aware feedback. Connect to inventory + contract limits.
6. **Multi-currency / locale.** All values are formatted as USD with
   English short-month names. Pull from session locale + currency.
7. **Empty Pickup data.** The Delivery section's `Pickup` row exists by
   default. Once a real address model is introduced, the row must only
   appear when the user actually selects a pickup destination.
8. **Accessibility audit.** Keyboard focus rings, ARIA labels for the
   picker, screen-reader announcements for the canvas pulse, and reduced-
   motion media queries (`prefers-reduced-motion`) are not implemented.
9. **Quote card actions.** `Go to quotes` and `Continue shopping` are
   stylistic placeholders without navigation wired.
10. **Date handling.** `Requested`, `Expires on`, `Last update`, and the
    "Submitted …" line in the quote card mix static labels with
    `formatQuoteSubmittedAt`. Centralise into a single date helper using
    user locale.

---

## 10. File map

| File | Purpose |
|---|---|
| `App.tsx` | Entire prototype: layout, state, chat logic, canvas, animations |
| `index.html` | Global styles, animation keyframes, scrollbar styles, fonts |
| `designTokens.ts` | Row-height token + class names |
| `components/Storefront.tsx` | Mock storefront preview (opened via top-left button) |
| `types.ts` | Shared TypeScript types (Contract) |
| `public/` | Static assets (product thumbnail) |
| `vite.config.ts` / `tsconfig.json` / `package.json` | Build setup |

---

If anything in this document does not match the running prototype, the
running prototype wins — file a follow-up in the same branch so we can
update the handoff.
