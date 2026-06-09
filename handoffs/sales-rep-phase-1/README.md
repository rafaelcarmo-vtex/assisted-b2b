# Storefront Order Buyer Prototype

High-fidelity, chat-driven order entry prototype for VTEX B2B. The buyer
talks to an AI assistant on the left while the order canvas on the right
fills out gradually as the model calls tools. The whole canvas is
read-only — the only interactive piece is the chat (plus the
*Request quote* button as a shortcut).

Built with **React 19 + Vite + Tailwind** and the **Vercel AI SDK** with
OpenAI `gpt-4o-mini`. State is in-memory only — see [`HANDOFF.md`](./HANDOFF.md)
for the complete spec.

## Architecture in 30 seconds

```
┌───────────────────────────┐        ┌────────────────────────────┐
│   App.tsx (client)        │        │   api/chat.ts (Edge)       │
│   useChat({               │        │   streamText({             │
│     transport: /api/chat  │ ─────► │     model: gpt-4o-mini,    │
│   })                      │        │     tools: { fill*, …}     │
│   onToolPart → flips      │ ◄───── │   })                       │
│   filledSlices in canvas  │  SSE   │                            │
└───────────────────────────┘        └────────────────────────────┘
```

The model decides what to do, narrates each step in the chat, and calls
one or more `fill*` tools per turn. Each tool flips a slice of the
canvas state to its predefined sample value, so the order builds up
gradually but always ends in the same canonical shape.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your OpenAI API key

Create `.env.local` at the repo root:

```
OPENAI_API_KEY=sk-...
```

(generate one at <https://platform.openai.com/api-keys>; needs a Billing
balance to call `gpt-4o-mini`).

For production, set the same variable on Vercel:

* Settings → Environment Variables → add `OPENAI_API_KEY` for
  Production, Preview and Development.

### 3. Run locally

```bash
npm run dev
```

That's it — Vite serves the UI on <http://localhost:3000> and a small
dev plugin in `vite.config.ts` runs `api/chat.ts` in-process so the
chat works without the Vercel CLI. `OPENAI_API_KEY` is read from
`.env.local` automatically.

## Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server (UI + `/api/chat` in-process) |
| `npm run build` | Type-check + bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

## Project structure

```
.
├── App.tsx                  ← Main app: layout, state, useChat, canvas, animations
├── api/
│   └── chat.ts              ← Vercel Edge Function: OpenAI + tools
├── index.html               ← Global styles, fonts, keyframes
├── index.tsx                ← Entry point
├── designTokens.ts          ← Row height token + class names
├── types.ts                 ← Shared TypeScript types
├── components/
│   ├── ContractAccountDrawer.tsx
│   ├── SidebarButton.tsx
│   └── Storefront.tsx       ← Mock storefront opened from the left rail
├── public/                  ← Static assets (product thumbnail, illustration)
├── HANDOFF.md               ← Engineering handoff (data model, flows, future work)
└── Design Guidelines.md     ← Design system reference
```

## How the AI integration works

* **Backend** (`api/chat.ts`): a minimal Vercel Edge Function that uses
  `streamText` from `ai`, exposes ~6 zero-argument tools (`fillItems`,
  `fillDelivery`, `fillPayment`, `fillBilling`, `fillExtras`,
  `requestQuote`) and streams a UI-message response.
* **Frontend** (`App.tsx`): the canvas state is a `filledSlices` object;
  each slice (`items`, `delivery`, `payment`, `billing`, `promoCode`,
  `poNumber`, `comments`) flips to `true` when the matching tool output
  appears in the chat stream. The data shown when a slice is filled
  comes from the hardcoded `FILLED_*` constants — the order outcome is
  always the same, only the *cadence* of filling is dynamic.
* **Chat UI**: powered by `useChat` from `@ai-sdk/react`. Streaming
  text shows up in the conversation; tool calls are silent side effects
  that the user sees materialize on the canvas.

To change the model, swap `openai('gpt-4o-mini')` in `api/chat.ts`. To
change the conversational behavior, edit the `SYSTEM_PROMPT` constant.

## Key flows

1. **Free-form chat fill** — buyer types something like *"add the items
   and set delivery"*. The model narrates and calls `fillItems` then
   `fillDelivery`, sections animate in one after the other.
2. **File import** — drop a file (or paperclip it) and send. The
   composer adds a hidden tag instructing the model to treat it as a
   request to fill everything. The model runs `fillItems`, `fillDelivery`,
   `fillPayment`, `fillBilling`, `fillExtras` in sequence.
3. **Request quote** — clicking *Request quote* in the footer prefills
   the composer with the quote context. After sending, the model calls
   `requestQuote`, the canvas pulses for ~2.5 s, then switches to the
   *Pending quote* state (new title `QR…`, amber alert).

For the full breakdown read `HANDOFF.md`.

## Status

Prototype. Numbers, addresses, dates, payment details and the
catalogue are mocked — only the *conversation* uses a real model. The
next iteration should replace the hardcoded `FILLED_*` constants with
real catalogue / customer data and give the tools real arguments
(SKU, quantity, address, etc.) so the LLM can author truly dynamic
orders. See the *Known limitations & future considerations* section in
`HANDOFF.md`.
