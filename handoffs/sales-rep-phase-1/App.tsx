import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from 'ai';
import SalesRepHome from './components/SalesRepHome';
import { ORDER_ROW_HEADER_CLASS, ORDER_ROW_HEIGHT_CLASS } from './designTokens';
import { Contract } from './types';

const ORDER_ENTRY_SESSION_KEY = 'order-entry-session-context';
const COMMENTS_MAX_LENGTH = 300;

interface SessionContext {
  contractId: string;
  contractName: string;
  userHandle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userDepartment: string;
}

interface ProductLineItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  discount: string;
  unitPrice: string;
  subtotal: string;
  shipTo: string;
  accounting: string;
  extraCount?: string;
  comment?: string;
}

interface SummaryFillData {
  orderTotal: string;
  paymentMethod: string;
  paymentOwner: string;
  paymentMaskedNumber: string;
  paymentExpiration: string;
  paymentCardholder: string;
  billingTitle: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingAddressLine3: string;
  billingAddressLine4: string;
}

interface DeliveryLine {
  id: string;
  shipToLabel: string;
  addressTitle: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  destinationCode?: string;
  contactName?: string;
  contactPhone?: string;
  shippingType: string;
  shippingEtaLabel: string;
  shippingEtaValue: string;
  items: string;
  subtotal: string;
}

interface AccountingFieldsFillData {
  promoCode: string;
  poNumber: string;
  costCenter: string;
  department: string;
  release: string;
  comments: string;
}

const DEFAULT_MESSAGE_PLACEHOLDER = 'Message...';
const REQUEST_QUOTE_PLACEHOLDER = 'Add any details or terms for your quote request...';
const EMPTY_FIELD_PLACEHOLDER = 'Not added yet';
const EMPTY_ITEMS_PLACEHOLDER = 'No items added yet';
const PLACEHOLDER_TOOLTIP_LABEL = 'Add via chat';

const FILLING_OUT_ORDER_DURATION_MS = 8000;

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  let lastIdx = 0;
  let keyCounter = 0;
  const regex = /\*\*([^*\n]+)\*\*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      result.push(
        <React.Fragment key={keyCounter++}>{text.slice(lastIdx, match.index)}</React.Fragment>
      );
    }
    result.push(
      <span key={keyCounter++} className="font-semibold">
        {match[1]}
      </span>
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    result.push(<React.Fragment key={keyCounter++}>{text.slice(lastIdx)}</React.Fragment>);
  }
  return result;
};

const renderMarkdownParagraphs = (text: string): React.ReactNode => {
  const paragraphs = text.split(/\n\s*\n/);
  const blocks: React.ReactNode[] = [];
  paragraphs.forEach((para, paraIdx) => {
    const trimmed = para.trim();
    if (!trimmed) return;
    const lines = trimmed.split('\n');
    type Segment = { type: 'text' | 'quote'; lines: string[] };
    const segments: Segment[] = [];
    for (const line of lines) {
      const isQuote = line.trim().startsWith('>');
      const segType: Segment['type'] = isQuote ? 'quote' : 'text';
      const last = segments[segments.length - 1];
      if (last && last.type === segType) {
        last.lines.push(line);
      } else {
        segments.push({ type: segType, lines: [line] });
      }
    }
    segments.forEach((seg, segIdx) => {
      const key = `p${paraIdx}-s${segIdx}`;
      if (seg.type === 'quote') {
        const inner = seg.lines
          .map((line) => line.trim().replace(/^>\s?/, ''))
          .join('\n');
        blocks.push(
          <blockquote
            key={key}
            className="m-0 pl-3 border-l-[3px] border-[#E0E0E0]"
          >
            <p className="whitespace-pre-wrap break-words">
              {renderInlineMarkdown(inner)}
            </p>
          </blockquote>
        );
      } else {
        const segText = seg.lines.join('\n');
        blocks.push(
          <p key={key} className="whitespace-pre-wrap">
            {renderInlineMarkdown(segText)}
          </p>
        );
      }
    });
  });
  return blocks;
};

const splitConfirmationText = (text: string): { prefix: string; question: string } => {
  const trimmed = text.trim();
  const paragraphBreakIdx = trimmed.lastIndexOf('\n\n');
  if (paragraphBreakIdx !== -1) {
    return {
      prefix: trimmed.slice(0, paragraphBreakIdx).trim(),
      question: trimmed.slice(paragraphBreakIdx + 2).trim(),
    };
  }
  const lastQuestionMarkIdx = trimmed.lastIndexOf('?');
  if (lastQuestionMarkIdx === -1) {
    return { prefix: trimmed, question: '' };
  }
  let start = 0;
  for (let i = lastQuestionMarkIdx - 1; i >= 0; i--) {
    const ch = trimmed[i];
    if (ch === '.' || ch === '!' || ch === '?' || ch === '\n') {
      start = i + 1;
      break;
    }
  }
  return {
    prefix: trimmed.slice(0, start).trim(),
    question: trimmed.slice(start, lastQuestionMarkIdx + 1).trim(),
  };
};

type SliceName = 'items' | 'delivery' | 'payment' | 'billing' | 'promoCode' | 'poNumber' | 'comments';
type FilledSlices = Record<SliceName, boolean>;

const EMPTY_SLICES: FilledSlices = {
  items: false,
  delivery: false,
  payment: false,
  billing: false,
  promoCode: false,
  poNumber: false,
  comments: false,
};

const FULL_SLICES: FilledSlices = {
  items: true,
  delivery: true,
  payment: true,
  billing: true,
  promoCode: true,
  poNumber: true,
  comments: true,
};

interface UserMessageAttachment {
  name: string;
  label: string;
  icon: string;
  iconBg: string;
}

const GREETING_MESSAGE = `Hi! I'm your Order Assistant.

Tell me what you'd like to order, or upload a file and I'll build the order for you.

You can:
• Add products and quantities
• Upload order lists or spreadsheets
• Set delivery, billing or payment details
• Request a quote

Supported formats: xlsx, csv, docx and txt.`;
const QUOTE_NOTE_PLACEHOLDER =
  "Hi team, we need this full hardware list for the Q1 rollout, but our budget caps at $30k. Could you apply a discount so the total lands under that? Thanks!";
const QUOTE_REQUESTED_AT_LABEL = 'Apr 28, 2026, at 10:42 AM';
const QUOTE_EXPIRES_ON_LABEL = 'May 12, 2026';
const QUOTE_EXPIRES_ON_SUFFIX = 'in 2 weeks';
const QUOTE_LAST_UPDATE_LABEL = 'Apr 28, 2026, at 10:42 AM';
const QUOTE_ORDER_TITLE = 'QR06032026-0011';

const QUOTE_RESPONDED_AT_LABEL = 'Apr 29, 2026, at 09:31 AM';
const QUOTE_REVISED_EXPIRES_ON_LABEL = 'May 13, 2026';
const QUOTE_REVISED_EXPIRES_ON_SUFFIX = 'in 2 weeks';
const QUOTE_REVISED_LAST_UPDATE_LABEL = 'Apr 29, 2026, at 09:31 AM';
const QUOTE_SALES_REP_NAME = 'Andrew Miller';
const QUOTE_SALES_REP_INITIAL = 'A';
const REP_SELF_NAME = 'Andrew Miller';
const REP_SELF_INITIAL = 'A';
const QUOTE_REP_COMMENT_PLACEHOLDER =
  "Got it. I've extended our Q1 phone promo (25% off the ONEPRO and ONEBIZ lines) and applied a 10% partner discount on the Core series. That lands the total at $29,289.01, comfortably under your $30k cap. Let me know if you want to revisit anything before the quote expires.";

const REVISED_PRODUCT_DISCOUNTS: Record<string, number> = {
  '01': 0.25,
  '02': 0.25,
  '03': 0.25,
  '04': 0.25,
  '05': 0.1,
  '06': 0.1,
  '07': 0.1,
  '08': 0.1,
};

const QUOTE_RESPONSE_MESSAGE_ID_PREFIX = 'quote-response-';
const QUOTE_RESPONSE_HEADLINE = 'Good news! Your quote has been answered. Your quote request details:';

type WriteBreathTag = 'span' | 'div' | 'p' | 'article' | 'section';

const WriteBreath: React.FC<{
  pulseKey: number | undefined;
  children: React.ReactNode;
  className?: string;
  as?: WriteBreathTag;
}> = ({ pulseKey, children, className = '', as = 'span' }) => {
  const Tag = as as React.ElementType;
  const combined = `${className} ${pulseKey ? 'canvas-write-breathe' : ''}`.trim();
  return (
    <Tag key={pulseKey ?? 'idle'} className={combined || undefined}>
      {children}
    </Tag>
  );
};

const QuantityStepper: React.FC<{
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const parsed = digits.length > 0 ? parseInt(digits, 10) : NaN;
    const next = Number.isNaN(parsed) ? value : Math.max(1, parsed);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={`inline-flex items-center h-8 rounded-full border border-[#E0E0E0] bg-white ${disabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center rounded-l-full text-[#1F1F1F] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
      >
        <span className="material-symbols-outlined text-[16px]">remove</span>
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Quantity"
        className="w-10 h-8 text-center text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F] tabular-nums bg-transparent outline-none rounded-[4px] focus:bg-[#F5F5F5] transition-colors disabled:cursor-not-allowed"
      />
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center rounded-r-full text-[#1F1F1F] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="Increase quantity"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
      </button>
    </div>
  );
};

const DiscountStepper: React.FC<{
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const parsed = digits.length > 0 ? parseInt(digits, 10) : 0;
    const next = Math.min(100, Math.max(0, parsed));
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={`inline-flex items-center h-8 rounded-full border border-[#E0E0E0] bg-white pr-[2px] ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center rounded-l-full text-[#0366DD] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        aria-label="Decrease discount"
      >
        <span className="material-symbols-outlined text-[16px]">remove</span>
      </button>
      <div className="flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          maxLength={3}
          readOnly={disabled}
          tabIndex={disabled ? -1 : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(String(value));
              event.currentTarget.blur();
            }
          }}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Discount percentage"
          className="w-7 h-8 text-center text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F] tabular-nums bg-transparent outline-none rounded-[4px] focus:bg-[#F5F5F5] transition-colors"
        />
        <span className="text-[12px] leading-none font-normal text-[#ADADAD] select-none -ml-[2px]">%</span>
      </div>
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center rounded-r-full text-[#0366DD] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        onClick={() => onChange(Math.min(100, value + 1))}
        disabled={disabled || value >= 100}
        aria-label="Increase discount"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
      </button>
    </div>
  );
};

const EditablePriceInput: React.FC<{
  value: number;
  onCommit: (next: number) => void;
  bold?: boolean;
  ariaLabel: string;
  disabled?: boolean;
}> = ({ value, onCommit, bold = false, ariaLabel, disabled = false }) => {
  const [draft, setDraft] = useState<string>(value.toFixed(2));

  useEffect(() => {
    setDraft(value.toFixed(2));
  }, [value]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const next = Math.round(parsed * 100) / 100;
      setDraft(next.toFixed(2));
      if (next !== value) onCommit(next);
    } else {
      setDraft(value.toFixed(2));
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-3 pb-[1px] transition-colors justify-end border-b border-[#E0E0E0] ${
        disabled ? 'opacity-60' : 'focus-within:border-[#0366DD]'
      }`}
    >
      <span className="text-[12px] leading-none text-[#ADADAD] select-none">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        readOnly={disabled}
        tabIndex={disabled ? -1 : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(value.toFixed(2));
            event.currentTarget.blur();
          }
        }}
        onFocus={(event) => {
          if (disabled) {
            event.currentTarget.blur();
            return;
          }
          event.currentTarget.select();
        }}
        aria-label={ariaLabel}
        className={`w-[80px] h-5 text-right text-[14px] leading-5 tracking-[-0.01em] tabular-nums text-[#1F1F1F] bg-transparent border-none outline-none ${
          bold ? 'font-semibold' : 'font-medium'
        }`}
      />
    </div>
  );
};

const CheckoutConfirmDialog: React.FC<{
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, onCancel, onConfirm }) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-confirm-title"
        aria-describedby="checkout-confirm-description"
        className="w-full max-w-[520px] rounded-[12px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-5 p-5 pb-10">
          <h2
            id="checkout-confirm-title"
            className="text-[18px] leading-[24px] tracking-[-0.02em] font-semibold text-[#1F1F1F]"
          >
            Continue to checkout without the quote?
          </h2>
          <p
            id="checkout-confirm-description"
            className="text-[14px] leading-5 tracking-[-0.01em] text-[#5C5C5C]"
          >
            Your quote request to sales will be revoked and you&apos;ll pay the current list price for these items. The order content stays the same, and you can request a new quote later if needed.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[#EBEBEB]">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="h-[40px] rounded-[20px] bg-white border border-[#E0E0E0] px-5 inline-flex items-center text-[#1F1F1F] text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366DD] focus-visible:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[40px] rounded-[20px] bg-[#0366DD] px-5 inline-flex items-center text-white text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#0255B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366DD] focus-visible:ring-offset-2 transition-colors"
          >
            Revoke and continue
          </button>
        </div>
      </div>
    </div>
  );
};

const SendToBuyerConfirmDialog: React.FC<{
  open: boolean;
  proposedComment: string | null;
  onCancel: () => void;
  onConfirm: (comment: string | null) => void;
}> = ({ open, proposedComment, onCancel, onConfirm }) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(proposedComment ?? '');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, proposedComment, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmed = draft.trim();
    onConfirm(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-buyer-title"
        aria-describedby="send-to-buyer-description"
        className="w-full max-w-[520px] rounded-[12px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-5 p-5 pb-10">
          <h2
            id="send-to-buyer-title"
            className="text-[18px] leading-[24px] tracking-[-0.02em] font-semibold text-[#1F1F1F]"
          >
            Send revised quote to Buyer?
          </h2>
          <p
            id="send-to-buyer-description"
            className="text-[14px] leading-5 tracking-[-0.01em] text-[#5C5C5C]"
          >
            The Buyer will receive the revised proposal with your changes. Add an optional comment below.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">
              Comment
            </span>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add an optional comment for the Buyer."
              rows={4}
              maxLength={500}
              className="w-full min-h-[96px] rounded-[8px] border border-[#E0E0E0] px-3 py-2 text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] placeholder:text-[#858585] resize-none focus:outline-none focus:border-[#0366DD] focus:ring-2 focus:ring-[#0366DD]/20"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[#EBEBEB]">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="h-[40px] rounded-[20px] bg-white border border-[#E0E0E0] px-5 inline-flex items-center text-[#1F1F1F] text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366DD] focus-visible:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-[40px] rounded-[20px] bg-[#0366DD] px-5 inline-flex items-center text-white text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#0255B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366DD] focus-visible:ring-offset-2 transition-colors"
          >
            Send quote
          </button>
        </div>
      </div>
    </div>
  );
};

const formatQuoteSubmittedAt = (date: Date) => {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const hh = hours12.toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${year}, at ${hh}:${mm} ${ampm}`;
};

const STOREFRONT_WINDOW_NAME = 'demostore-storefront-tab';
const ORDER_CANVAS_TITLE = 'PO06032026-0011';

const FILLED_PRODUCTS: ProductLineItem[] = [
  {
    id: '01',
    name: 'Axiom One Pro 5G - 256GB / 8GB RAM',
    sku: 'AXM-ONEPRO-256-GRY',
    quantity: 12,
    discount: '5%',
    unitPrice: '$299.00',
    subtotal: '$2,520.00',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '02',
    name: 'Axiom One Pro 5G - 256GB / 8GB RAM (Secure Edition)',
    sku: 'AXM-ONEPRO-256-SEC',
    quantity: 12,
    discount: '6%',
    unitPrice: '$279.00',
    subtotal: '$2,616.48',
    shipTo: 'Pickup: Springfield Store · Express shipping',
    accounting: 'POSLG019989990005 · 0002 - Operations · Finance',
    comment: 'Devices allocated to leadership and finance teams. Secure Edition required for VPN access and internal compliance.',
  },
  {
    id: '03',
    name: 'Axiom One Pro 5G - 128GB / 6GB RAM',
    sku: 'AXM-ONEPRO-128-BLK',
    quantity: 12,
    discount: '5%',
    unitPrice: '$259.00',
    subtotal: '$2,478.60',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '04',
    name: 'Axiom One Business 5G - 128GB / 6GB RAM',
    sku: 'AXM-ONEBIZ-128',
    quantity: 12,
    discount: '4%',
    unitPrice: '$239.00',
    subtotal: '$2,389.44',
    shipTo: 'Pickup: Springfield Store · Express shipping',
    accounting: 'POSLG019989990005 · 0002 - Operations · Finance',
  },
  {
    id: '05',
    name: 'Axiom Core Business 5G - 128GB / 6GB RAM',
    sku: 'AXM-CORE-128-GRY',
    quantity: 11,
    discount: '6%',
    unitPrice: '$229.00',
    subtotal: '$2,367.86',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '06',
    name: 'Axiom Core Business 5G - Workforce Edition',
    sku: 'AXM-CORE-WRK',
    quantity: 11,
    discount: '5%',
    unitPrice: '$219.00',
    subtotal: '$2,288.55',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
    comment: 'Model approved for frontline and operations teams. Please ensure IMEI registration before shipment.',
  },
  {
    id: '07',
    name: 'Axiom Core Business - 64GB / 4GB RAM',
    sku: 'AXM-CORE-64',
    quantity: 11,
    discount: '4%',
    unitPrice: '$209.00',
    subtotal: '$2,207.04',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '08',
    name: 'Axiom Core Lite - Frontline Edition',
    sku: 'AXM-CORE-LT',
    quantity: 11,
    discount: '3%',
    unitPrice: '$199.00',
    subtotal: '$2,123.33',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '09',
    name: 'Axiom Field Business - 64GB / 4GB RAM',
    sku: 'AXM-FIELD-64',
    quantity: 10,
    discount: '4%',
    unitPrice: '$189.00',
    subtotal: '$1,814.40',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
  },
  {
    id: '10',
    name: 'Axiom Field Business - Rugged Case Bundle',
    sku: 'AXM-FIELD-BNDL',
    quantity: 10,
    discount: '5%',
    unitPrice: '$376.38',
    subtotal: '$3,763.84',
    shipTo: 'Ship to: Boston Boylston · Standard shipping',
    accounting: 'POSL01 · R&D · Finance & Operations',
    extraCount: '+6',
    comment: 'Bundle includes rugged case and screen protector. Required for field usage and warehouse environments.',
  },
];

const PRODUCT_THUMBNAIL_FILTERS = [
  'none',
  'hue-rotate(8deg) saturate(1.05)',
  'hue-rotate(-10deg) saturate(0.95)',
  'hue-rotate(16deg) saturate(1.1) contrast(1.02)',
  'hue-rotate(-18deg) saturate(0.9)',
  'hue-rotate(24deg) saturate(1.08)',
  'hue-rotate(-28deg) saturate(0.92) brightness(0.98)',
  'hue-rotate(34deg) saturate(1.12)',
  'hue-rotate(-40deg) saturate(0.88)',
  'hue-rotate(46deg) saturate(1.06) contrast(1.04)',
] as const;

const FILLED_SUMMARY_DATA: SummaryFillData = {
  orderTotal: '$24,569.54',
  paymentMethod: 'Credit card',
  paymentOwner: 'Procurement Manager',
  paymentMaskedNumber: '************1234',
  paymentExpiration: '03/28',
  paymentCardholder: 'Alex Thompson',
  billingTitle: 'Boston Boylston',
  billingAddressLine1: '8234 Boylston Street',
  billingAddressLine2: 'Building B, Block 3',
  billingAddressLine3: 'Boston, MA 02467',
  billingAddressLine4: 'United States',
};

const FILLED_DELIVERY_ROWS: DeliveryLine[] = [
  {
    id: '1',
    shipToLabel: 'Ship to',
    addressTitle: 'Boston Boylston',
    addressLine1: '8234 Boylston Street',
    addressLine2: 'Building B, Block 3',
    addressLine3: 'Boston, MA 02467',
    addressLine4: 'United States',
    destinationCode: 'DT1731200727786',
    contactName: 'Arthur Mast',
    contactPhone: '(780) 824-6723',
    shippingType: 'Standard shipping',
    shippingEtaLabel: 'Estimated delivery',
    shippingEtaValue: '5-7 business days',
    items: '48',
    subtotal: '$0.00',
  },
  {
    id: '2',
    shipToLabel: 'Pickup',
    addressTitle: 'Springfield Store',
    addressLine1: '456 Maple Avenue',
    addressLine2: 'Unit 7, Sector 4',
    addressLine3: 'Springfield, IL 62704',
    addressLine4: 'United States',
    shippingType: 'Express shipping',
    shippingEtaLabel: 'Estimated delivery',
    shippingEtaValue: '1-2 business days',
    items: '64',
    subtotal: '$24.80',
  },
];

const FILLED_ACCOUNTING_FIELDS: AccountingFieldsFillData = {
  promoCode: 'OFFICEWEEK2026',
  poNumber: 'PO-01937981739826492',
  costCenter: '0002 - Operations',
  department: 'Finance',
  release: 'RLSOP023045010202',
  comments:
    'Replenishment requested to restore standard office supply stock levels for Q1 2026, based on recent consumption and forecasted operational needs. This will ensure continuity of operations and avoid ad-hoc purchases.',
};

const parseCurrencyToNumber = (value: string) => Number(value.replace(/[^0-9.-]+/g, '')) || 0;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const CONTRACTS: Contract[] = [
  { id: '1', name: 'Stellar Global' },
  { id: '116', name: 'Aether Energy Solutions' },
  { id: '105', name: 'Apex Digital Solutions' },
  { id: '107', name: 'Beacon Security Corp' },
  { id: '125', name: 'Blue Chip Consulting' },
  { id: '119', name: 'Catalyst Bio-Research' },
  { id: '121', name: 'Core Fintech Group' },
  { id: '109', name: 'Echo Communications' },
  { id: '123', name: 'Frontier AI Research' },
  { id: '8', name: 'Horizon Cloud Services' },
  { id: '111', name: 'Ironclad Data Centers' },
  { id: '7', name: 'Nebula Infrastructure' },
  { id: '108', name: 'Nova Logistics Network' },
  { id: '118', name: 'Oasis Sustainable Tech' },
  { id: '114', name: 'Orbit Satellite Systems' },
  { id: '110', name: 'Prism Creative Lab' },
  { id: '115', name: 'Pulse Healthcare Systems' },
  { id: '6', name: 'Quantum Systems Europe' },
  { id: '124', name: 'Skyline Real Estate' },
  { id: '4', name: 'Stellar Energy Group' },
  { id: '5', name: 'Stellar Logistics & Supply Chain' },
  { id: '3', name: 'Stellar Manufacturing Co.' },
  { id: '2', name: 'Stellar Tech Solutions' },
  { id: '106', name: 'Summit Analytics Group' },
  { id: '120', name: 'Titan Heavy Industries' },
  { id: '126', name: 'Alpha Logistics' },
  { id: '127', name: 'BioGen Materials' },
  { id: '128', name: 'Crestwood Financial' },
  { id: '129', name: 'Delta Aviation' },
  { id: '130', name: 'Epsilon Software' },
  { id: '131', name: 'Falcon Aerospace' },
  { id: '132', name: 'Giga Factory' },
  { id: '133', name: 'Helios Solar' },
  { id: '134', name: 'Infinia Networks' },
  { id: '135', name: 'Jupiter Mining' },
  { id: '136', name: 'Kinetix Dynamics' },
  { id: '137', name: 'Lunar Estates' },
  { id: '138', name: 'Manta Marine' },
  { id: '139', name: 'Nexus Core' },
  { id: '140', name: 'Omega Watch' },
  { id: '141', name: 'Paradox Labs' },
  { id: '142', name: 'Quasar Energy' },
  { id: '143', name: 'Redwood Timber' },
  { id: '144', name: 'Sigma Robotics' },
  { id: '145', name: 'Terraform Engineering' },
  { id: '146', name: 'Unity Global' },
  { id: '147', name: 'Vortex Systems' },
  { id: '148', name: 'Wyvern Security' },
  { id: '149', name: 'Xylem Dynamics' },
  { id: '150', name: 'Zenon Architecture' },
];

interface OrderBuilderRoute {
  active: boolean;
  quoteSlug: string | null;
}

interface QuoteContextData {
  contractName: string;
  buyerName: string;
  buyerHandle: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDepartment: string;
  intro: string;
  note: string;
  outro: string;
}

const QUOTE_CONTEXTS: Record<string, QuoteContextData> = {
  'stellar-global': {
    contractName: 'Stellar Global',
    buyerName: 'Kelly Davis',
    buyerHandle: 'kdavis',
    buyerEmail: 'k.davis@stellar.com',
    buyerPhone: '+1 (617) 234-5678',
    buyerDepartment: 'Operations and facilities',
    intro: `Hi Andrew! **Kelly Davis** from **Stellar Global** just submitted a new quote request for your review.`,
    note: `Hi team, we need this full hardware list for the Q1 rollout, but our budget caps at $30k. Could you apply a discount so the total lands under that? Thanks!`,
    outro: `To land the order under Kelly's **$30,000 cap**, applying a **14% discount across all items** brings the total to about **$29,629.65** (saving roughly **$4,818**), comfortably under her target. **Shall I apply it?**`,
  },
};

const parseOrderBuilderRoute = (): OrderBuilderRoute => {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#order-builder')) {
    return { active: false, quoteSlug: null };
  }
  const queryStart = hash.indexOf('?');
  let quoteSlug: string | null = null;
  if (queryStart !== -1) {
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const raw = params.get('quote');
    if (raw && QUOTE_CONTEXTS[raw]) {
      quoteSlug = raw;
    }
  }
  return { active: true, quoteSlug };
};

interface OrderBuilderPageProps {
  quoteSlug: string | null;
}

const OrderBuilderPage: React.FC<OrderBuilderPageProps> = ({ quoteSlug }) => {
  const quoteContext = quoteSlug ? QUOTE_CONTEXTS[quoteSlug] ?? null : null;
  const readSessionContext = (): SessionContext => {
    const fallback: SessionContext = {
      contractId: '1',
      contractName: 'Stellar Global',
      userHandle: 'kdavis',
      userName: 'Kelly Davis',
      userEmail: 'k.davis@stellar.com',
      userPhone: '+1 (617) 234-5678',
      userDepartment: 'Operations and facilities',
    };
    if (quoteContext) {
      return {
        contractId: '1',
        contractName: quoteContext.contractName,
        userHandle: quoteContext.buyerHandle,
        userName: quoteContext.buyerName,
        userEmail: quoteContext.buyerEmail,
        userPhone: quoteContext.buyerPhone,
        userDepartment: quoteContext.buyerDepartment,
      };
    }
    try {
      const raw = window.localStorage.getItem(ORDER_ENTRY_SESSION_KEY);
      if (!raw) return fallback;
      const parsed = { ...fallback, ...(JSON.parse(raw) as Partial<SessionContext>) };
      if (parsed.userDepartment === 'Finance and operations') {
        parsed.userDepartment = 'Operations and facilities';
      }
      return parsed;
    } catch {
      return fallback;
    }
  };

  const [sessionContext, setSessionContext] = useState<SessionContext>(() => readSessionContext());
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [message, setMessage] = useState('');
  const [messagePlaceholder, setMessagePlaceholder] = useState(DEFAULT_MESSAGE_PLACEHOLDER);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [showTopMessageFade, setShowTopMessageFade] = useState(false);
  const [showBottomMessageFade, setShowBottomMessageFade] = useState(false);
  const [filledSlices, setFilledSlices] = useState<FilledSlices>(quoteContext ? FULL_SLICES : EMPTY_SLICES);
  const [writingPulses, setWritingPulses] = useState<Record<string, number>>({});
  const writingPulseCounterRef = useRef<number>(0);
  const triggerWritePulse = useCallback((id: string) => {
    writingPulseCounterRef.current += 1;
    const next = writingPulseCounterRef.current;
    setWritingPulses((previous) => ({ ...previous, [id]: next }));
  }, []);
  const [isQuotePending, setIsQuotePending] = useState(Boolean(quoteContext));
  const [isQuoteRevised, setIsQuoteRevised] = useState(false);
  const [repCommentToBuyer, setRepCommentToBuyer] = useState<string | null>(null);
  const [dismissedAlertKey, setDismissedAlertKey] = useState<'pending' | 'revised' | null>(null);

  useEffect(() => {
    if (!isQuotePending) {
      setDismissedAlertKey(null);
    }
  }, [isQuotePending]);
  const [isQuoteProcessing, setIsQuoteProcessing] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const bulkImportTimerRef = useRef<number | null>(null);
  const bulkImportHasSeenBusyRef = useRef<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [attachmentsByMessageId, setAttachmentsByMessageId] = useState<Record<string, UserMessageAttachment>>({});
  const [quoteCardByCallId, setQuoteCardByCallId] = useState<
    Record<
      string,
      {
        itemsCount: number;
        totalLabel: string;
        submittedAt: string;
        status: 'pending' | 'revoked' | 'revised' | 'superseded';
        note?: string;
        noteAuthor?: string;
        noteDate?: string;
        respondedAt?: string;
        repComment?: string;
        repName?: string;
        repInitial?: string;
        expiresOnLabel?: string;
        expiresOnSuffix?: string;
      }
    >
  >({});
  const latestQuoteCallIdRef = useRef<string | null>(null);
  const latestQuoteNoteRef = useRef<string>('');
  const [visibleProductCount, setVisibleProductCount] = useState(5);
  const [animatingProductIds, setAnimatingProductIds] = useState<string[]>([]);
  const [disappearingProductIds, setDisappearingProductIds] = useState<string[]>([]);
  const [isRequestQuoteActive, setIsRequestQuoteActive] = useState(false);
  const [quoteFlowActive, setQuoteFlowActive] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [productDiscountOverrides, setProductDiscountOverrides] = useState<Record<string, number>>({});
  const [productUnitPriceOverrides, setProductUnitPriceOverrides] = useState<Record<string, number>>({});
  const [removedProductIds, setRemovedProductIds] = useState<string[]>([]);
  const repMode = Boolean(quoteContext);
  const [extrasOverrides, setExtrasOverrides] = useState<{
    promoCode?: string;
    poNumber?: string;
    comments?: string;
  }>({});
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [isSendToBuyerOpen, setIsSendToBuyerOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  const hasFilledItems = filledSlices.items;
  const hasFilledDelivery = filledSlices.delivery;
  const hasPaymentMethod = filledSlices.payment;
  const hasBillingAddress = filledSlices.billing;
  const promoCode = filledSlices.promoCode
    ? extrasOverrides.promoCode ?? FILLED_ACCOUNTING_FIELDS.promoCode
    : '';
  const poNumber = filledSlices.poNumber
    ? extrasOverrides.poNumber ?? FILLED_ACCOUNTING_FIELDS.poNumber
    : '';
  const comments = filledSlices.comments
    ? extrasOverrides.comments ?? FILLED_ACCOUNTING_FIELDS.comments
    : '';
  // Deprecated alias retained for canvas blocks not yet split (eg. items section).
  const hasFilledProducts = hasFilledItems;
  const isOrderStarted = hasFilledItems || hasFilledDelivery;
  const shipToDeliveryAddress = '';
  const pickupDeliveryAddress = '';
  const shipToDeliveryOption = '';
  const pickupDeliveryOption = '';

  const getProductQuantity = (item: ProductLineItem) =>
    productQuantities[item.id] ?? item.quantity;

  const setProductQuantity = (itemId: string, next: number) => {
    setProductQuantities((previous) => ({ ...previous, [itemId]: Math.max(1, next) }));
  };

  const activeProducts = useMemo(
    () => FILLED_PRODUCTS.filter((item) => !removedProductIds.includes(item.id)),
    [removedProductIds]
  );

  const findProductByIdentifier = (identifier: string): ProductLineItem | undefined => {
    const needle = identifier.trim().toLowerCase();
    if (!needle) return undefined;
    return (
      activeProducts.find((item) => item.id === needle) ??
      activeProducts.find(
        (item) =>
          item.sku.toLowerCase() === needle || item.name.toLowerCase() === needle
      ) ??
      activeProducts.find(
        (item) =>
          item.sku.toLowerCase().includes(needle) ||
          item.name.toLowerCase().includes(needle)
      )
    );
  };

  const removeProductLineItem = (itemId: string) => {
    setDisappearingProductIds((previous) =>
      previous.includes(itemId) ? previous : [...previous, itemId]
    );
    window.setTimeout(() => {
      setRemovedProductIds((previous) =>
        previous.includes(itemId) ? previous : [...previous, itemId]
      );
      setDisappearingProductIds((previous) => previous.filter((id) => id !== itemId));
      setProductQuantities((previous) => {
        if (!(itemId in previous)) return previous;
        const next = { ...previous };
        delete next[itemId];
        return next;
      });
    }, 240);
  };

  const getProductDiscountPercent = (item: ProductLineItem) => {
    if (repMode) return (productDiscountOverrides[item.id] ?? 0) / 100;
    return isQuoteRevised ? REVISED_PRODUCT_DISCOUNTS[item.id] ?? 0 : 0;
  };

  const getRepDiscountPercentInt = (item: ProductLineItem) =>
    productDiscountOverrides[item.id] ?? 0;

  const getProductBaseUnitPrice = (item: ProductLineItem) => {
    if (repMode && productUnitPriceOverrides[item.id] !== undefined) {
      return productUnitPriceOverrides[item.id];
    }
    return parseCurrencyToNumber(item.unitPrice);
  };

  const getEffectiveUnitPriceValue = (item: ProductLineItem) =>
    getProductBaseUnitPrice(item) * (1 - getProductDiscountPercent(item));

  const getProductSubtotalValue = (item: ProductLineItem) =>
    getEffectiveUnitPriceValue(item) * getProductQuantity(item);

  const getOriginalProductSubtotalValue = (item: ProductLineItem) =>
    parseCurrencyToNumber(item.unitPrice) * getProductQuantity(item);

  const isProductEditedByRep = (item: ProductLineItem) => {
    if (!repMode) return false;
    const baseChanged =
      productUnitPriceOverrides[item.id] !== undefined &&
      Math.abs(
        productUnitPriceOverrides[item.id] - parseCurrencyToNumber(item.unitPrice)
      ) > 0.005;
    return getRepDiscountPercentInt(item) > 0 || baseChanged;
  };

  const setProductDiscountPercent = (itemId: string, next: number) => {
    setProductDiscountOverrides((previous) => ({
      ...previous,
      [itemId]: Math.min(100, Math.max(0, Math.round(next))),
    }));
  };

  const setProductBaseUnitPrice = (itemId: string, next: number) => {
    setProductUnitPriceOverrides((previous) => ({
      ...previous,
      [itemId]: Math.max(0, Math.round(next * 100) / 100),
    }));
  };

  const setProductEffectiveUnitPrice = (item: ProductLineItem, displayed: number) => {
    const discountFactor = 1 - getProductDiscountPercent(item);
    const base = discountFactor > 0 ? displayed / discountFactor : displayed;
    setProductBaseUnitPrice(item.id, base);
  };

  const setProductSubtotalValue = (item: ProductLineItem, subtotal: number) => {
    const qty = Math.max(1, getProductQuantity(item));
    const displayed = subtotal / qty;
    setProductEffectiveUnitPrice(item, displayed);
  };

  const computeProductSubtotal = (item: ProductLineItem) =>
    formatCurrency(getProductSubtotalValue(item));
  const dragDepthRef = useRef(0);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasScrollRef = useRef<HTMLElement | null>(null);
  const showMoreLessButtonRef = useRef<HTMLDivElement | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadTimeoutRef = useRef<number | null>(null);
  const productRevealAnimationTimeoutRef = useRef<number | null>(null);
  const lastArrowPressRef = useRef<{ key: 'up' | 'down'; time: number } | null>(null);
  const canvasScrollAnimationRef = useRef<number | null>(null);

  const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes('Files');

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsFileDragOver(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsFileDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    if (nextFile) {
      setAttachedFile(nextFile);
      setIsFileUploading(true);
      if (uploadTimeoutRef.current) {
        window.clearTimeout(uploadTimeoutRef.current);
      }
      uploadTimeoutRef.current = window.setTimeout(() => {
        setIsFileUploading(false);
      }, 4000);
    }
    dragDepthRef.current = 0;
    setIsFileDragOver(false);
  };

  const updateMessageFades = () => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    const hasOverflow = textarea.scrollHeight > textarea.clientHeight + 1;
    setShowTopMessageFade(hasOverflow);
    setShowBottomMessageFade(hasOverflow);
  };

  const hasMessage = message.trim().length > 0;
  const hasSendPayload = hasMessage || attachedFile !== null;
  const hasComposerPills = attachedFile !== null;
  const composerMinHeightClass = hasComposerPills ? 'min-h-[152px]' : 'min-h-[108px]';
  const initialAssistantMessage = useMemo<UIMessage>(
    () => ({
      id: 'greeting',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: quoteContext
            ? `${quoteContext.intro}\n\n${quoteContext.outro}`
            : GREETING_MESSAGE,
          state: 'done',
        },
      ],
    }),
    [quoteContext]
  );

  const chatRequestContextRef = useRef<{
    mode: 'buyer' | 'sales-rep';
    quoteContext: {
      buyerName: string;
      buyerEmail: string;
      buyerDepartment: string;
      contractName: string;
      buyerNote: string;
    } | null;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      quantity: number;
      baseUnitPrice: number;
      effectiveUnitPrice: number;
      discountPercent: number;
      subtotal: number;
    }>;
    orderTotal: number;
  }>({ mode: 'buyer', quoteContext: null, items: [], orderTotal: 0 });

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages: msgs, body }) => ({
          body: {
            ...(body ?? {}),
            messages: msgs,
            mode: chatRequestContextRef.current.mode,
            quoteContext: chatRequestContextRef.current.quoteContext,
            items: chatRequestContextRef.current.items,
            orderTotal: chatRequestContextRef.current.orderTotal,
          },
        }),
      }),
    []
  );

  const chat = useChat({
    transport: chatTransport,
    messages: [initialAssistantMessage],
    onError: (error) => {
      setChatError(error.message || 'The assistant is unavailable right now.');
    },
  });

  const messages = chat.messages;
  const chatStatus = chat.status;
  const isChatBusy = chatStatus === 'submitted' || chatStatus === 'streaming';

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const latestAssistantHasTools = useMemo(
    () =>
      latestAssistantMessage
        ? latestAssistantMessage.parts.some((part) => isToolUIPart(part))
        : false,
    [latestAssistantMessage]
  );

  const isCanvasUpdating =
    isBulkImporting || (isChatBusy && latestAssistantHasTools);

  const isSubmittingQuote = useMemo(() => {
    if (!isChatBusy) return false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'user') continue;
      const text = message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
      return text.includes('[Quote-request STEP 2');
    }
    return false;
  }, [isChatBusy, messages]);

  const canvasStateKey = isQuoteRevised
    ? 'revised'
    : isQuotePending
    ? 'pending'
    : hasFilledItems || hasFilledDelivery
    ? 'filled'
    : 'empty';

  const dispatchedToolCallsRef = useRef<Set<string>>(new Set());
  const quoteAnimationTimerRef = useRef<number | null>(null);

  const applySliceFill = (slice: SliceName) => {
    setFilledSlices((previous) => (previous[slice] ? previous : { ...previous, [slice]: true }));
    if (slice === 'items') {
      setVisibleProductCount(5);
      setAnimatingProductIds([]);
      setDisappearingProductIds([]);
    }
  };

  const revertQuoteToDraft = () => {
    setIsQuotePending(false);
    setIsQuoteRevised(false);
    setRepCommentToBuyer(null);
    setIsQuoteProcessing(false);
    if (quoteAnimationTimerRef.current) {
      window.clearTimeout(quoteAnimationTimerRef.current);
      quoteAnimationTimerRef.current = null;
    }
    latestQuoteCallIdRef.current = null;
    setQuoteFlowActive(false);
    canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutClick = () => {
    if (repMode) return;
    if (isQuotePending && !isQuoteRevised) {
      setIsCheckoutConfirmOpen(true);
      return;
    }
  };

  const handleConfirmCheckout = () => {
    setIsCheckoutConfirmOpen(false);
    revertQuoteToDraft();
  };

  const latestProposedComment = useMemo<string | null>(() => {
    if (!repMode) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      if (msg.id === 'greeting') return null;
      const text = msg.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
      const lines = text.split('\n');
      const quoteLines: string[] = [];
      let inQuote = false;
      for (const line of lines) {
        if (line.trim().startsWith('>')) {
          inQuote = true;
          quoteLines.push(line.trim().replace(/^>\s?/, ''));
        } else if (inQuote) {
          break;
        }
      }
      const result = quoteLines.join('\n').trim();
      return result.length > 0 ? result : null;
    }
    return null;
  }, [messages, repMode]);

  const hasRepEdits = useMemo(() => {
    if (!repMode) return false;
    if (removedProductIds.length > 0) return true;
    for (const item of activeProducts) {
      if (isProductEditedByRep(item)) return true;
      const defaultQty = item.quantity;
      const currentQty = productQuantities[item.id];
      if (currentQty !== undefined && currentQty !== defaultQty) return true;
    }
    return false;
  }, [
    repMode,
    activeProducts,
    productQuantities,
    productDiscountOverrides,
    productUnitPriceOverrides,
    removedProductIds,
  ]);

  const isRepCanvasLocked = repMode && isQuoteRevised;

  const handleSendToBuyer = () => {
    if (isQuoteRevised || !hasRepEdits) return;
    setIsSendToBuyerOpen(true);
  };

  const handleRepRevoke = () => {
    if (!repMode || !isQuoteRevised) return;
    setIsQuoteRevised(false);
    setRepCommentToBuyer(null);
    setQuoteCardByCallId((previous) => {
      const next = { ...previous };
      for (const [callId, card] of Object.entries(previous)) {
        if (
          callId.startsWith(QUOTE_RESPONSE_MESSAGE_ID_PREFIX) &&
          card.status === 'revised'
        ) {
          next[callId] = { ...card, status: 'revoked' };
        }
      }
      return next;
    });
    canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const injectRepRevisedRecap = (comment: string | null) => {
    const syntheticMessageId = `${QUOTE_RESPONSE_MESSAGE_ID_PREFIX}${Date.now()}`;
    const respondedAt = formatQuoteSubmittedAt(new Date());
    setQuoteCardByCallId((previous) => ({
      ...previous,
      [syntheticMessageId]: {
        itemsCount: filledProductsCount,
        totalLabel: formatCurrency(orderTotalValue),
        submittedAt: QUOTE_REQUESTED_AT_LABEL,
        status: 'revised',
        note: quoteContext?.note,
        noteAuthor: quoteContext?.buyerName,
        noteDate: QUOTE_REQUESTED_AT_LABEL,
        respondedAt,
        repName: REP_SELF_NAME,
        repInitial: REP_SELF_INITIAL,
        repComment: comment ?? '',
        expiresOnLabel: QUOTE_REVISED_EXPIRES_ON_LABEL,
        expiresOnSuffix: QUOTE_REVISED_EXPIRES_ON_SUFFIX,
      },
    }));
    latestQuoteCallIdRef.current = syntheticMessageId;
    chat.setMessages((previous) => [
      ...previous,
      {
        id: syntheticMessageId,
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '',
            state: 'done',
          },
        ],
      } as UIMessage,
    ]);
  };

  const handleConfirmSendToBuyer = (comment: string | null) => {
    setIsSendToBuyerOpen(false);
    const finalComment =
      comment && comment.trim().length > 0 ? comment.trim() : null;
    if (finalComment) {
      setRepCommentToBuyer(finalComment);
    }
    setIsQuoteRevised(true);
    setIsQuoteProcessing(false);
    injectRepRevisedRecap(finalComment);
    canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatBusy) return;
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (part.state !== 'output-available') continue;
        if (dispatchedToolCallsRef.current.has(part.toolCallId)) continue;
        dispatchedToolCallsRef.current.add(part.toolCallId);

        const toolName = getToolName(part);
        if (
          isRepCanvasLocked &&
          (toolName === 'setLineItemQuantity' ||
            toolName === 'setAllLineItemQuantities' ||
            toolName === 'setLineItemDiscount' ||
            toolName === 'setAllLineItemDiscounts' ||
            toolName === 'setLineItemUnitPrice' ||
            toolName === 'removeLineItem')
        ) {
          continue;
        }
        switch (toolName) {
          case 'fillItems':
            applySliceFill('items');
            break;
          case 'fillDelivery':
            applySliceFill('delivery');
            triggerWritePulse('delivery');
            break;
          case 'fillPayment':
            applySliceFill('payment');
            triggerWritePulse('payment');
            break;
          case 'fillBilling':
            applySliceFill('billing');
            triggerWritePulse('billing');
            break;
          case 'fillExtras':
            setFilledSlices((previous) => ({
              ...previous,
              promoCode: true,
              poNumber: true,
              comments: true,
            }));
            setExtrasOverrides({});
            triggerWritePulse('promoCode');
            triggerWritePulse('poNumber');
            triggerWritePulse('comments');
            break;
          case 'setLineItemQuantity': {
            const input = part.input as
              | { productIdentifier?: unknown; quantity?: unknown }
              | undefined;
            const identifier =
              typeof input?.productIdentifier === 'string' ? input.productIdentifier : '';
            const quantityRaw =
              typeof input?.quantity === 'number'
                ? input.quantity
                : Number(input?.quantity);
            if (!identifier.trim() || !Number.isFinite(quantityRaw)) break;
            const quantity = Math.max(1, Math.floor(quantityRaw));
            const match = findProductByIdentifier(identifier);
            if (match) {
              setProductQuantity(match.id, quantity);
              triggerWritePulse(`item:${match.id}`);
            }
            break;
          }
          case 'setAllLineItemQuantities': {
            const input = part.input as { quantity?: unknown } | undefined;
            const quantityRaw =
              typeof input?.quantity === 'number'
                ? input.quantity
                : Number(input?.quantity);
            if (!Number.isFinite(quantityRaw)) break;
            const quantity = Math.max(1, Math.floor(quantityRaw));
            setProductQuantities((previous) => {
              const next = { ...previous };
              for (const item of activeProducts) {
                next[item.id] = quantity;
              }
              return next;
            });
            for (const item of activeProducts) {
              triggerWritePulse(`item:${item.id}`);
            }
            break;
          }
          case 'removeLineItem': {
            const input = part.input as { productIdentifier?: unknown } | undefined;
            const identifier =
              typeof input?.productIdentifier === 'string' ? input.productIdentifier : '';
            if (!identifier.trim()) break;
            const match = findProductByIdentifier(identifier);
            if (match) {
              removeProductLineItem(match.id);
            }
            break;
          }
          case 'updatePromoCode': {
            const input = part.input as { promoCode?: unknown } | undefined;
            const nextValue =
              typeof input?.promoCode === 'string' ? input.promoCode.trim() : '';
            if (!nextValue) break;
            setExtrasOverrides((previous) => ({ ...previous, promoCode: nextValue }));
            setFilledSlices((previous) => ({ ...previous, promoCode: true }));
            triggerWritePulse('promoCode');
            break;
          }
          case 'updatePoNumber': {
            const input = part.input as { poNumber?: unknown } | undefined;
            const nextValue =
              typeof input?.poNumber === 'string' ? input.poNumber.trim() : '';
            if (!nextValue) break;
            setExtrasOverrides((previous) => ({ ...previous, poNumber: nextValue }));
            setFilledSlices((previous) => ({ ...previous, poNumber: true }));
            triggerWritePulse('poNumber');
            break;
          }
          case 'updateComments': {
            const input = part.input as { comments?: unknown } | undefined;
            const nextValue =
              typeof input?.comments === 'string' ? input.comments : '';
            if (!nextValue.trim()) break;
            setExtrasOverrides((previous) => ({ ...previous, comments: nextValue }));
            setFilledSlices((previous) => ({ ...previous, comments: true }));
            triggerWritePulse('comments');
            break;
          }
          case 'requestQuote': {
            const itemsCountSnapshot = hasFilledItems ? filledProductsCount : 0;
            const totalSnapshot = isOrderStarted ? orderTotalValue : 0;
            const toolCallId = part.toolCallId;
            const noteSnapshot = latestQuoteNoteRef.current.trim();
            const submittedAt = formatQuoteSubmittedAt(new Date());
            setQuoteCardByCallId((previous) => ({
              ...previous,
              [toolCallId]: {
                itemsCount: itemsCountSnapshot,
                totalLabel: formatCurrency(totalSnapshot),
                submittedAt,
                status: 'pending',
                note: noteSnapshot || undefined,
                noteAuthor: sessionContext.userName,
                noteDate: submittedAt,
                expiresOnLabel: QUOTE_EXPIRES_ON_LABEL,
                expiresOnSuffix: QUOTE_EXPIRES_ON_SUFFIX,
              },
            }));
            latestQuoteCallIdRef.current = toolCallId;
            latestQuoteNoteRef.current = '';
            if (quoteAnimationTimerRef.current) {
              window.clearTimeout(quoteAnimationTimerRef.current);
              quoteAnimationTimerRef.current = null;
            }
            setIsQuoteProcessing(false);
            setIsQuotePending(true);
            setQuoteFlowActive(false);
            canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          }
          case 'revokeQuote': {
            revertQuoteToDraft();
            break;
          }
          case 'setLineItemDiscount': {
            const input = part.input as
              | { productIdentifier?: unknown; discountPercent?: unknown }
              | undefined;
            const identifier =
              typeof input?.productIdentifier === 'string'
                ? input.productIdentifier
                : '';
            const discountRaw =
              typeof input?.discountPercent === 'number'
                ? input.discountPercent
                : Number(input?.discountPercent);
            if (!identifier.trim() || !Number.isFinite(discountRaw)) break;
            const match = findProductByIdentifier(identifier);
            if (match) {
              setProductDiscountPercent(match.id, discountRaw);
              triggerWritePulse(`item:${match.id}`);
            }
            break;
          }
          case 'setAllLineItemDiscounts': {
            const input = part.input as { discountPercent?: unknown } | undefined;
            const discountRaw =
              typeof input?.discountPercent === 'number'
                ? input.discountPercent
                : Number(input?.discountPercent);
            if (!Number.isFinite(discountRaw)) break;
            const clamped = Math.min(100, Math.max(0, Math.round(discountRaw)));
            setProductDiscountOverrides((previous) => {
              const next = { ...previous };
              for (const item of activeProducts) {
                next[item.id] = clamped;
              }
              return next;
            });
            for (const item of activeProducts) {
              triggerWritePulse(`item:${item.id}`);
            }
            break;
          }
          case 'setLineItemUnitPrice': {
            const input = part.input as
              | { productIdentifier?: unknown; unitPrice?: unknown }
              | undefined;
            const identifier =
              typeof input?.productIdentifier === 'string'
                ? input.productIdentifier
                : '';
            const priceRaw =
              typeof input?.unitPrice === 'number'
                ? input.unitPrice
                : Number(input?.unitPrice);
            if (!identifier.trim() || !Number.isFinite(priceRaw)) break;
            const match = findProductByIdentifier(identifier);
            if (match) {
              setProductBaseUnitPrice(match.id, Math.max(0, priceRaw));
              setProductDiscountPercent(match.id, 0);
              triggerWritePulse(`item:${match.id}`);
            }
            break;
          }
          case 'sendRevisedQuote': {
            const input = part.input as { comment?: unknown } | undefined;
            const repCommentValue =
              typeof input?.comment === 'string' && input.comment.trim().length > 0
                ? input.comment.trim()
                : undefined;
            if (repCommentValue) {
              setRepCommentToBuyer(repCommentValue);
            }
            setIsQuoteRevised(true);
            setIsQuoteProcessing(false);
            injectRepRevisedRecap(repCommentValue ?? null);
            canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          }
          default:
            break;
        }
      }
    }
  }, [messages, isChatBusy, isRepCanvasLocked]);

  useEffect(() => {
    return () => {
      if (quoteAnimationTimerRef.current) {
        window.clearTimeout(quoteAnimationTimerRef.current);
      }
    };
  }, []);

  const getProductDeliveryRowId = (item: ProductLineItem) =>
    item.shipTo.toLowerCase().includes('springfield') ? '2' : '1';
  const deliveryItemsCountByRowId = activeProducts.reduce<Record<string, number>>((acc, item) => {
    const rowId = getProductDeliveryRowId(item);
    acc[rowId] = (acc[rowId] ?? 0) + getProductQuantity(item);
    return acc;
  }, {});
  const filledProductsCount = activeProducts.reduce((sum, item) => sum + getProductQuantity(item), 0);
  const productsSubtotalValue = hasFilledItems
    ? activeProducts.reduce((sum, item) => sum + getProductSubtotalValue(item), 0)
    : 0;
  const productsOriginalSubtotalValue = hasFilledItems
    ? activeProducts.reduce((sum, item) => sum + getOriginalProductSubtotalValue(item), 0)
    : 0;
  const productsDiscountValue = Math.max(0, productsOriginalSubtotalValue - productsSubtotalValue);
  const deliverySubtotalValue = hasFilledDelivery
    ? FILLED_DELIVERY_ROWS.reduce((sum, row) => sum + parseCurrencyToNumber(row.subtotal), 0)
    : 0;
  const TAX_RATE = 0.23;
  const taxesValue = hasFilledItems || hasFilledDelivery
    ? (productsSubtotalValue + deliverySubtotalValue) * TAX_RATE
    : 0;
  const orderTotalValue = productsSubtotalValue + deliverySubtotalValue + taxesValue;

  chatRequestContextRef.current = {
    mode: repMode ? 'sales-rep' : 'buyer',
    quoteContext: quoteContext
      ? {
          buyerName: quoteContext.buyerName,
          buyerEmail: quoteContext.buyerEmail,
          buyerDepartment: quoteContext.buyerDepartment,
          contractName: quoteContext.contractName,
          buyerNote: quoteContext.note,
        }
      : null,
    items: activeProducts.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: getProductQuantity(item),
      baseUnitPrice: getProductBaseUnitPrice(item),
      effectiveUnitPrice: getEffectiveUnitPriceValue(item),
      discountPercent: Math.round(getProductDiscountPercent(item) * 100),
      subtotal: getProductSubtotalValue(item),
    })),
    orderTotal: orderTotalValue,
  };

  const orderTitle = isQuotePending ? QUOTE_ORDER_TITLE : ORDER_CANVAS_TITLE;
  const productsSubtotalLabel = formatCurrency(productsSubtotalValue);
  const deliverySubtotalLabel = formatCurrency(deliverySubtotalValue);
  const orderTotalLabel = formatCurrency(orderTotalValue);
  const productsDiscountLabel = `-${formatCurrency(productsDiscountValue)}`;
  const displayedProducts = activeProducts.slice(0, visibleProductCount);
  const hasMoreProductsToShow = visibleProductCount < activeProducts.length;
  const nextProductsBatchSize = Math.min(5, Math.max(0, activeProducts.length - visibleProductCount));

  const clearRequestQuoteContext = () => {
    setIsRequestQuoteActive(false);
    setMessagePlaceholder(DEFAULT_MESSAGE_PLACEHOLDER);
  };

  const handleRequestQuoteClick = () => {
    setIsRequestQuoteActive(true);
    setMessagePlaceholder(REQUEST_QUOTE_PLACEHOLDER);
    window.requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  const handleShowMoreProducts = () => {
    setDisappearingProductIds([]);
    setVisibleProductCount((current) => {
      const nextVisibleCount = Math.min(current + 5, activeProducts.length);
      const nextAnimatedIds = activeProducts.slice(current, nextVisibleCount).map((item) => item.id);
      setAnimatingProductIds(nextAnimatedIds);
      if (productRevealAnimationTimeoutRef.current) {
        window.clearTimeout(productRevealAnimationTimeoutRef.current);
      }
      productRevealAnimationTimeoutRef.current = window.setTimeout(() => {
        setAnimatingProductIds([]);
        productRevealAnimationTimeoutRef.current = null;
      }, 260);
      return nextVisibleCount;
    });
  };

  const handleShowLessProducts = () => {
    setAnimatingProductIds([]);
    if (productRevealAnimationTimeoutRef.current) {
      window.clearTimeout(productRevealAnimationTimeoutRef.current);
      productRevealAnimationTimeoutRef.current = null;
    }
    const idsToHide = activeProducts.slice(5, visibleProductCount).map((item) => item.id);
    if (idsToHide.length === 0) {
      return;
    }

    const scrollPanel = canvasScrollRef.current;
    const anchorElement = showMoreLessButtonRef.current;
    const anchorOffsetBefore = scrollPanel && anchorElement
      ? anchorElement.getBoundingClientRect().top - scrollPanel.getBoundingClientRect().top
      : null;

    setDisappearingProductIds(idsToHide);

    productRevealAnimationTimeoutRef.current = window.setTimeout(() => {
      flushSync(() => {
        setVisibleProductCount(5);
        setDisappearingProductIds([]);
      });
      productRevealAnimationTimeoutRef.current = null;

      if (scrollPanel && anchorElement && anchorOffsetBefore !== null) {
        const anchorOffsetAfter =
          anchorElement.getBoundingClientRect().top - scrollPanel.getBoundingClientRect().top;
        const delta = anchorOffsetAfter - anchorOffsetBefore;
        if (delta !== 0) {
          scrollPanel.scrollTop += delta;
        }
      }
    }, 240);
  };

  const handleOpenStorefront = () => {
    const storefrontUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const storefrontTab = window.open(storefrontUrl, STOREFRONT_WINDOW_NAME);
    if (storefrontTab) {
      storefrontTab.focus();
    } else {
      window.location.href = storefrontUrl;
    }
  };

  const handleSendMessage = () => {
    if (!hasSendPayload || isChatBusy) return;

    const trimmedMessage = message.trim();
    const sentAttachment = attachedFile
      ? { name: attachedFile.name, ...getFileMeta(attachedFile) }
      : undefined;

    let textToSend = trimmedMessage;
    let nextQuoteFlowActive = quoteFlowActive;
    if (sentAttachment) {
      const fileTag = `[User attached a file: ${sentAttachment.name} (${sentAttachment.label}). Treat this as an instruction to fill the entire order from the file.]`;
      textToSend = trimmedMessage ? `${trimmedMessage}\n\n${fileTag}` : fileTag;
    } else if (isRequestQuoteActive) {
      const quoteTag = trimmedMessage
        ? '[Quote-request STEP 1 — WITH a note: the buyer just clicked the Request quote button and the text above IS their note / terms / conditions. Apply rule 6 STEP 1: reply with TWO paragraphs — (1) summary echoing their note + reminder of the 2-business-day response window, (2) ONE short confirmation question ("Should I submit it now?"). Do NOT call requestQuote on this turn. Do NOT add the next-steps menu. The acknowledgment + tool call only happen on STEP 2, after the buyer confirms.]'
        : '[Quote-request STEP 1 — NO note: the buyer just clicked the Request quote button without typing anything. Apply rule 6 STEP 1: reply with TWO paragraphs — (1) summary saying you will submit a quote with no extra terms + reminder of the 2-business-day response window, (2) ONE short confirmation question ("Should I submit it now?"). Do NOT call requestQuote on this turn. Do NOT add the next-steps menu.]';
      textToSend = trimmedMessage ? `${trimmedMessage}\n\n${quoteTag}` : quoteTag;
      latestQuoteNoteRef.current = trimmedMessage;
      nextQuoteFlowActive = true;
    } else if (quoteFlowActive) {
      const flowTag = '[Quote-request STEP 2 — confirmation response: this buyer message is a reply to the summary + confirmation question you asked in your PREVIOUS assistant turn (rule 6 STEP 1). Apply rule 6 STEP 2:\n  - Case CONFIRM (buyer says "yes"/"send it"/"pode mandar"/"confirma"/"ok"/"go ahead"/affirmative): write ONE short acknowledgment ("Submitting your quote request with a note asking for <X>." or "Submitting your quote request.") AND call requestQuote in the SAME turn. Stop after the tool call. Do NOT add the next-steps menu.\n  - Case EDIT (buyer adjusts the note, e.g. "actually make it 15% instead", "muda para 20%"): loop back to STEP 1 with the updated note — reply with a fresh summary + confirmation question. Do NOT call the tool yet.\n  - Case CANCEL (buyer backs out, e.g. "cancel", "deixa pra lá", "espera"): acknowledge and handle the new instruction. Do NOT call the tool.\nUnder NO circumstances skip the acknowledgment+tool pairing on CONFIRM. Text alone does not submit the order; the tool call is mandatory.]';
      textToSend = trimmedMessage ? `${trimmedMessage}\n\n${flowTag}` : flowTag;
    }

    const stateTag = repMode
      ? '[Sales-rep session. You (the rep) have full ownership of this quote and the order is fully editable from the rep canvas. Apply discount, quantity, unit-price, and removal tools directly. NEVER mention revoking, unlocking, or "the order is locked" — those are buyer-side concepts that do not apply here.]'
      : isQuotePending
      ? '[Order is in quote-pending state. Locked for editing. Refer to rule 7 of your instructions before responding.]'
      : '[Order is in draft state. The order is editable. Ignore any quote-pending tags from earlier messages — only the tag on this latest message reflects the current state.]';
    textToSend = textToSend ? `${textToSend}\n\n${stateTag}` : stateTag;

    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (sentAttachment) {
      setAttachmentsByMessageId((previous) => ({ ...previous, [userMessageId]: sentAttachment }));
    }

    setChatError(null);

    void chat.sendMessage({
      id: userMessageId,
      role: 'user',
      parts: [{ type: 'text', text: textToSend }],
    });

    if (sentAttachment) {
      setIsBulkImporting(true);
      bulkImportHasSeenBusyRef.current = false;
      if (bulkImportTimerRef.current !== null) {
        window.clearTimeout(bulkImportTimerRef.current);
        bulkImportTimerRef.current = null;
      }
      setExtrasOverrides({});
      setProductQuantities({});
      setRemovedProductIds([]);
      setDisappearingProductIds([]);
      setAnimatingProductIds([]);
      setVisibleProductCount(5);
      setFilledSlices(FULL_SLICES);
    }

    setMessage('');
    setAttachedFile(null);
    setIsFileUploading(false);
    if (uploadTimeoutRef.current) {
      window.clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    setQuoteFlowActive(nextQuoteFlowActive);
    clearRequestQuoteContext();
  };

  const handleCancelBulkImport = () => {
    if (bulkImportTimerRef.current !== null) {
      window.clearTimeout(bulkImportTimerRef.current);
      bulkImportTimerRef.current = null;
    }
    bulkImportHasSeenBusyRef.current = false;
    setIsBulkImporting(false);
    if (typeof chat.stop === 'function') {
      void chat.stop();
    }
  };

  useEffect(() => {
    if (!isBulkImporting) {
      bulkImportHasSeenBusyRef.current = false;
      return;
    }
    if (isChatBusy) {
      bulkImportHasSeenBusyRef.current = true;
      return;
    }
    if (!bulkImportHasSeenBusyRef.current) return;
    if (bulkImportTimerRef.current !== null) {
      window.clearTimeout(bulkImportTimerRef.current);
      bulkImportTimerRef.current = null;
    }
    bulkImportHasSeenBusyRef.current = false;
    setIsBulkImporting(false);
  }, [isBulkImporting, isChatBusy]);

  const getFileMeta = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { label: 'Spreadsheet', icon: 'table_chart', iconBg: '#08A822' };
    }
    if (file.type.startsWith('image/')) {
      return { label: 'Image', icon: 'image', iconBg: '#D93025' };
    }
    if (['pdf'].includes(ext)) {
      return { label: 'PDF', icon: 'picture_as_pdf', iconBg: '#D93025' };
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return { label: 'Document', icon: 'description', iconBg: '#D93025' };
    }
    return { label: 'File', icon: 'insert_drive_file', iconBg: '#0366DD' };
  };

  const attachFile = (file: File) => {
    setAttachedFile(file);
    setIsFileUploading(true);
    if (uploadTimeoutRef.current) {
      window.clearTimeout(uploadTimeoutRef.current);
    }
    uploadTimeoutRef.current = window.setTimeout(() => {
      setIsFileUploading(false);
    }, 4000);
  };

  const renderEmptyValue = (
    label: string,
    valueClassName: string = 'text-[14px] leading-5 tracking-[-0.01em]',
    tooltipSide: 'right' | 'left' = 'right'
  ) => (
    <span className="group relative inline-flex items-center">
      <span className={`${valueClassName} font-normal text-[#707070]`}>{label}</span>
      <span className="sr-only">. {PLACEHOLDER_TOOLTIP_LABEL}.</span>
      <span
        role="tooltip"
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-[6px] bg-black px-2 py-1 text-[12px] leading-4 font-medium text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${
          tooltipSide === 'left' ? 'right-full mr-2' : 'left-full ml-2'
        }`}
      >
        {PLACEHOLDER_TOOLTIP_LABEL}
      </span>
    </span>
  );

  const renderEmptyPlaceholder = () => renderEmptyValue(EMPTY_FIELD_PLACEHOLDER);

  useEffect(() => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    // Auto-grow upwards until max height.
    textarea.style.height = '0px';
    const maxTextareaHeight = attachedFile ? 168 : 232;
    const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight);
    textarea.style.height = `${Math.max(20, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    updateMessageFades();
  }, [message, attachedFile]);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        window.clearTimeout(uploadTimeoutRef.current);
      }
      if (productRevealAnimationTimeoutRef.current) {
        window.clearTimeout(productRevealAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ORDER_ENTRY_SESSION_KEY) {
        setSessionContext(readSessionContext());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const container = conversationScrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, chatStatus]);

  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const menuNode = attachMenuRef.current;
      if (!menuNode) return;
      if (!menuNode.contains(event.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAttachMenuOpen]);

  useEffect(() => {
    const DOUBLE_PRESS_WINDOW_MS = 400;
    const MIN_DURATION_MS = 480;
    const MAX_DURATION_MS = 900;
    const DURATION_PER_PX = 0.55;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const smoothScrollCanvasTo = (targetTop: number) => {
      const canvas = canvasScrollRef.current;
      if (!canvas) return;

      if (canvasScrollAnimationRef.current !== null) {
        cancelAnimationFrame(canvasScrollAnimationRef.current);
        canvasScrollAnimationRef.current = null;
      }

      const maxScroll = Math.max(0, canvas.scrollHeight - canvas.clientHeight);
      const clampedTarget = Math.max(0, Math.min(targetTop, maxScroll));
      const startTop = canvas.scrollTop;
      const distance = clampedTarget - startTop;
      if (Math.abs(distance) < 1) return;

      const duration = Math.min(
        MAX_DURATION_MS,
        Math.max(MIN_DURATION_MS, Math.abs(distance) * DURATION_PER_PX)
      );
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        canvas.scrollTop = startTop + distance * easeInOutCubic(progress);
        if (progress < 1) {
          canvasScrollAnimationRef.current = requestAnimationFrame(tick);
        } else {
          canvasScrollAnimationRef.current = null;
        }
      };

      canvasScrollAnimationRef.current = requestAnimationFrame(tick);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const direction: 'up' | 'down' = event.key === 'ArrowUp' ? 'up' : 'down';
      const now = Date.now();
      const previous = lastArrowPressRef.current;
      const isDoublePress =
        previous !== null &&
        previous.key === direction &&
        now - previous.time <= DOUBLE_PRESS_WINDOW_MS;

      if (!isDoublePress) {
        lastArrowPressRef.current = { key: direction, time: now };
        return;
      }

      const canvas = canvasScrollRef.current;
      if (!canvas) return;

      event.preventDefault();
      smoothScrollCanvasTo(direction === 'up' ? 0 : canvas.scrollHeight);
      lastArrowPressRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (canvasScrollAnimationRef.current !== null) {
        cancelAnimationFrame(canvasScrollAnimationRef.current);
        canvasScrollAnimationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const cancelPendingAnimations = () => {
      if (quoteAnimationTimerRef.current !== null) {
        window.clearTimeout(quoteAnimationTimerRef.current);
        quoteAnimationTimerRef.current = null;
      }
      if (bulkImportTimerRef.current !== null) {
        window.clearTimeout(bulkImportTimerRef.current);
        bulkImportTimerRef.current = null;
      }
      if (canvasScrollAnimationRef.current !== null) {
        cancelAnimationFrame(canvasScrollAnimationRef.current);
        canvasScrollAnimationRef.current = null;
      }
    };

    const handleDemoShortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey || !event.shiftKey) return;
      const codeToValue: Record<string, '0' | '1' | '2' | '3'> = {
        Digit0: '0',
        Digit1: '1',
        Digit2: '2',
        Digit3: '3',
      };
      const value = codeToValue[event.code];
      if (!value) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      cancelPendingAnimations();
      setAnimatingProductIds([]);
      setDisappearingProductIds([]);
      setVisibleProductCount(5);
      setIsQuoteProcessing(false);
      setIsBulkImporting(false);
      setQuoteFlowActive(false);
      setProductQuantities({});
      setRemovedProductIds([]);
      setExtrasOverrides({});

      const clearInjectedQuoteResponses = () =>
        chat.setMessages((previous) =>
          previous.filter((message) => !message.id.startsWith(QUOTE_RESPONSE_MESSAGE_ID_PREFIX))
        );

      switch (value) {
        case '0':
          setFilledSlices(EMPTY_SLICES);
          setIsQuotePending(false);
          setIsQuoteRevised(false);
          setQuoteCardByCallId({});
          latestQuoteCallIdRef.current = null;
          clearInjectedQuoteResponses();
          break;
        case '1':
          setFilledSlices(FULL_SLICES);
          setIsQuotePending(false);
          setIsQuoteRevised(false);
          clearInjectedQuoteResponses();
          break;
        case '2':
          setFilledSlices(FULL_SLICES);
          setIsQuotePending(true);
          setIsQuoteRevised(false);
          clearInjectedQuoteResponses();
          break;
        case '3': {
          setFilledSlices(FULL_SLICES);
          setIsQuotePending(true);
          setIsQuoteRevised(true);
          const syntheticMessageId = `${QUOTE_RESPONSE_MESSAGE_ID_PREFIX}${Date.now()}`;
          const previousCallId = latestQuoteCallIdRef.current;
          setQuoteCardByCallId((previous) => {
            const baseCard = previousCallId ? previous[previousCallId] : undefined;
            return {
              ...previous,
              [syntheticMessageId]: {
                itemsCount: baseCard?.itemsCount ?? FILLED_PRODUCTS.length,
                totalLabel: baseCard?.totalLabel ?? formatCurrency(0),
                submittedAt: baseCard?.submittedAt ?? QUOTE_REQUESTED_AT_LABEL,
                status: 'revised',
                note: baseCard?.note ?? QUOTE_NOTE_PLACEHOLDER,
                noteAuthor: baseCard?.noteAuthor ?? sessionContext.userName,
                noteDate: baseCard?.noteDate ?? QUOTE_REQUESTED_AT_LABEL,
                respondedAt: QUOTE_RESPONDED_AT_LABEL,
                repName: QUOTE_SALES_REP_NAME,
                repInitial: QUOTE_SALES_REP_INITIAL,
                repComment: QUOTE_REP_COMMENT_PLACEHOLDER,
                expiresOnLabel: QUOTE_REVISED_EXPIRES_ON_LABEL,
                expiresOnSuffix: QUOTE_REVISED_EXPIRES_ON_SUFFIX,
              },
            };
          });
          latestQuoteCallIdRef.current = syntheticMessageId;
          chat.setMessages((previous) => {
            const responseMessage: UIMessage = {
              id: syntheticMessageId,
              role: 'assistant',
              parts: [
                {
                  type: 'text',
                  text: QUOTE_RESPONSE_HEADLINE,
                  state: 'done',
                },
              ],
            };
            return [...previous, responseMessage];
          });
          break;
        }
      }

      canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('keydown', handleDemoShortcut);
    return () => window.removeEventListener('keydown', handleDemoShortcut);
  }, []);

  return (
    <div
      className="relative h-screen bg-white"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`h-full flex overflow-x-auto transition-opacity duration-150 ${isFileDragOver ? 'opacity-[0.12]' : 'opacity-100'}`}>
      <section className="h-full min-w-[420px] flex-1 bg-white flex flex-col overflow-hidden">
        <header className="h-[60px] px-[20px] flex items-center justify-between">
          <div className="py-1">
            <button
              type="button"
              className="text-[20px] leading-6 tracking-[-0.04em] font-bold text-[#0366DD] hover:opacity-80 transition-opacity"
              onClick={handleOpenStorefront}
              aria-label="Open Demostore"
            >
              Demostore
            </button>
          </div>
        </header>

        <div className="relative flex-1 p-[20px] flex flex-col overflow-hidden">
          <div ref={conversationScrollRef} className="panel-scroll flex-1 bg-white overflow-y-auto -mr-[18px] pr-[18px]">
            <div className="pb-10 space-y-10">
              {messages.map((chatMessage) => {
                const textContent = chatMessage.parts
                  .filter((part): part is { type: 'text'; text: string; state?: 'streaming' | 'done' } => part.type === 'text')
                  .map((part) => part.text)
                  .join('')
                  .trim();

                if (chatMessage.role === 'assistant') {
                  const isGreeting = chatMessage.id === 'greeting';
                  const isSyntheticQuoteResponse = chatMessage.id.startsWith(QUOTE_RESPONSE_MESSAGE_ID_PREFIX);
                  const quoteToolPart = chatMessage.parts.find(
                    (part) =>
                      isToolUIPart(part) &&
                      part.state === 'output-available' &&
                      getToolName(part) === 'requestQuote'
                  );
                  const quoteCard = isSyntheticQuoteResponse
                    ? quoteCardByCallId[chatMessage.id]
                    : quoteToolPart && isToolUIPart(quoteToolPart)
                      ? quoteCardByCallId[quoteToolPart.toolCallId]
                      : undefined;

                  const hasQuoteToolCall = chatMessage.parts.some(
                    (part) => isToolUIPart(part) && getToolName(part) === 'requestQuote'
                  );

                  let isQuoteConfirmationPrompt = false;
                  if (!hasQuoteToolCall && !isSyntheticQuoteResponse && !isGreeting) {
                    const messageIndex = messages.findIndex((m) => m.id === chatMessage.id);
                    if (messageIndex > 0) {
                      for (let i = messageIndex - 1; i >= 0; i--) {
                        const previous = messages[i];
                        if (previous.role === 'user') {
                          const previousText = previous.parts
                            .filter(
                              (p): p is { type: 'text'; text: string } => p.type === 'text'
                            )
                            .map((p) => p.text)
                            .join('');
                          if (
                            previousText.includes('[Request-quote context') ||
                            previousText.includes('[Quote-flow continuation') ||
                            previousText.includes('[Quote-request STEP ')
                          ) {
                            isQuoteConfirmationPrompt = true;
                          }
                          break;
                        }
                      }
                    }
                  }

                  if (!textContent && !quoteCard) return null;

                  const isLastMessage =
                    messages.length > 0 &&
                    messages[messages.length - 1].id === chatMessage.id;
                  const isLatestAssistantStreaming =
                    (isChatBusy || isSubmittingQuote) && isLastMessage;

                  if (isLatestAssistantStreaming && !quoteCard) {
                    return null;
                  }

                  if (isLastMessage && isSubmittingQuote && !quoteCard) {
                    return null;
                  }

                  const renderAssistantText = () => {
                    if (isLatestAssistantStreaming) {
                      return null;
                    }
                    const baseClass =
                      'text-[14px] leading-[1.4] tracking-[-0.01em] text-[#1F1F1F]';
                    if (isGreeting && quoteContext) {
                      const expiresLine = QUOTE_EXPIRES_ON_SUFFIX
                        ? `${QUOTE_EXPIRES_ON_LABEL} (${QUOTE_EXPIRES_ON_SUFFIX})`
                        : QUOTE_EXPIRES_ON_LABEL;
                      return (
                        <div className={`${baseClass} flex flex-col gap-4`}>
                          <p className="whitespace-pre-wrap">
                            {renderInlineMarkdown(quoteContext.intro)}
                          </p>
                          <div className="flex flex-col">
                            <div>
                              <span className="font-semibold">Status:</span> Pending
                            </div>
                            <div>
                              <span className="font-semibold">Request date:</span> {QUOTE_REQUESTED_AT_LABEL}
                            </div>
                            <div>
                              <span className="font-semibold">Expires on:</span> {expiresLine}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold">Notes:</span>
                            <div className="flex flex-col gap-1 pl-3 border-l-[3px] border-[#E0E0E0] mt-1">
                              <span className="font-medium">
                                {quoteContext.buyerName} · {QUOTE_REQUESTED_AT_LABEL}
                              </span>
                              <p className="whitespace-pre-wrap break-words">{quoteContext.note}</p>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap">
                            {renderInlineMarkdown(quoteContext.outro)}
                          </p>
                        </div>
                      );
                    }
                    if (hasQuoteToolCall) {
                      return (
                        <div className={`${baseClass} whitespace-pre-wrap`}>
                          <span className="font-semibold">Your quote request was sent successfully!</span> A sales representative will review the order and typically replies within <span className="font-semibold">2 business days</span>. Quote request details:
                        </div>
                      );
                    }
                    if (isSyntheticQuoteResponse) {
                      if (repMode) {
                        const buyerName = quoteContext?.buyerName ?? 'the buyer';
                        return (
                          <div className={`${baseClass} whitespace-pre-wrap`}>
                            <span className="font-semibold">Quote sent.</span> The revised proposal has been delivered to {buyerName}. Quote details:
                          </div>
                        );
                      }
                      return (
                        <div className={`${baseClass} whitespace-pre-wrap`}>
                          <span className="font-semibold">Good news!</span> Your quote has been answered. Your quote request details:
                        </div>
                      );
                    }
                    if (!textContent) return null;
                    if (isQuoteConfirmationPrompt) {
                      const { prefix, question } = splitConfirmationText(textContent);
                      return (
                        <div className={`${baseClass} flex flex-col gap-3`}>
                          {prefix && (
                            <p className="whitespace-pre-wrap">
                              {renderInlineMarkdown(prefix)}
                            </p>
                          )}
                          {question && (
                            <p className="whitespace-pre-wrap font-semibold">
                              {renderInlineMarkdown(question)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className={`${baseClass} flex flex-col gap-3`}>
                        {renderMarkdownParagraphs(textContent)}
                      </div>
                    );
                  };

                  const isRevisedSyntheticResponse =
                    isSyntheticQuoteResponse && quoteCard?.status === 'revised';

                  return (
                    <div key={chatMessage.id} className="chat-message-appear w-full flex flex-col gap-4">
                      {renderAssistantText()}
                      {quoteCard && (() => {
                        const isRevoked = quoteCard.status === 'revoked';
                        const isRevised = quoteCard.status === 'revised';
                        const isSuperseded = quoteCard.status === 'superseded';
                        const isDimmed = isRevoked || isSuperseded;
                        const statusLabel = isRevoked
                          ? 'Revoked'
                          : isRevised
                            ? 'Revised'
                            : isSuperseded
                              ? 'Updated'
                              : 'Pending';
                        const expiresLabel = quoteCard.expiresOnLabel ?? QUOTE_EXPIRES_ON_LABEL;
                        const expiresSuffix = quoteCard.expiresOnSuffix ?? QUOTE_EXPIRES_ON_SUFFIX;
                        const expiresLine = expiresSuffix
                          ? `${expiresLabel} (${expiresSuffix})`
                          : expiresLabel;
                        const buyerNote = quoteCard.note?.trim();
                        const noteAuthor = quoteCard.noteAuthor ?? sessionContext.userName;
                        const noteDate = quoteCard.noteDate ?? quoteCard.submittedAt;
                        const showBuyerNote = Boolean(buyerNote) && !isRevised;
                        const showRepReply = isRevised && Boolean(quoteCard.repComment && quoteCard.repName);
                        const hasNoteContent = showBuyerNote || showRepReply;
                        return (
                          <div className={`w-full flex flex-col gap-4 text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] ${isDimmed ? 'opacity-70' : ''}`}>
                            <div className="flex flex-col">
                              <div>
                                <span className="font-semibold">Status:</span> {statusLabel}
                              </div>
                              <div>
                                <span className="font-semibold">Request date:</span> {quoteCard.submittedAt}
                              </div>
                              {isRevised && quoteCard.respondedAt && (
                                <div>
                                  <span className="font-semibold">Response date:</span> {quoteCard.respondedAt}
                                </div>
                              )}
                              {isRevised && quoteCard.repName && (
                                <div>
                                  <span className="font-semibold">Sales Rep:</span> {quoteCard.repName}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold">Expires on:</span> {expiresLine}
                              </div>
                            </div>

                            {hasNoteContent && (
                              <div className="flex flex-col">
                                <span className="font-semibold">{isRevised ? 'Latest reply:' : 'Notes:'}</span>
                                <div className="flex flex-col gap-2 mt-1">
                                  {showBuyerNote && buyerNote && (
                                    <div className="flex flex-col gap-1 pl-3 border-l-[3px] border-[#E0E0E0]">
                                      <span className="font-medium">
                                        {noteAuthor} · {noteDate}
                                      </span>
                                      <p className="whitespace-pre-wrap break-words">{buyerNote}</p>
                                    </div>
                                  )}
                                  {showRepReply && quoteCard.repComment && quoteCard.repName && (
                                    <div className="flex flex-col gap-1 pl-3 border-l-[3px] border-[#E0E0E0]">
                                      <span className="font-medium">
                                        {quoteCard.repName} · {quoteCard.respondedAt}
                                      </span>
                                      <p className="whitespace-pre-wrap break-words">{quoteCard.repComment}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {quoteCard && quoteCard.status === 'pending' && (
                        <div className="text-[14px] leading-[1.4] tracking-[-0.01em] text-[#1F1F1F] flex flex-col gap-3">
                          <p>
                            The quote expires on{' '}
                            <span className="font-semibold">
                              {quoteCard.expiresOnLabel ?? QUOTE_EXPIRES_ON_LABEL}
                            </span>
                            , after which you'll need to submit a new request.
                          </p>
                          <p>While the sales rep reviews this, you can:</p>
                          <ol className="list-decimal pl-5 flex flex-col gap-1">
                            <li>Continue shopping in the storefront</li>
                            <li>View all your quotes</li>
                            <li>Revoke this quote to return to draft and edit the order</li>
                          </ol>
                          <p>How would you like to proceed?</p>
                        </div>
                      )}
                      {isRevisedSyntheticResponse && quoteCard && repMode && (
                        <div className="text-[14px] leading-[1.4] tracking-[-0.01em] text-[#1F1F1F] flex flex-col gap-3">
                          <p>
                            The revised proposal locks in the new total of{' '}
                            <span className="font-semibold">
                              {quoteCard.totalLabel ?? orderTotalLabel}
                            </span>{' '}
                            until{' '}
                            <span className="font-semibold">
                              {quoteCard.expiresOnLabel ?? QUOTE_REVISED_EXPIRES_ON_LABEL}
                            </span>
                            . {quoteContext?.buyerName ?? 'The buyer'} will be notified and can
                            accept the offer directly.
                          </p>
                        </div>
                      )}
                      {isRevisedSyntheticResponse && quoteCard && !repMode && (
                        <div className="text-[14px] leading-[1.4] tracking-[-0.01em] text-[#1F1F1F] flex flex-col gap-3">
                          <p>
                            The revised proposal brings the order total to{' '}
                            <span className="font-semibold">{orderTotalLabel}</span>, comfortably
                            under your <span className="font-semibold">$30k cap</span>. The new
                            pricing is locked in until{' '}
                            <span className="font-semibold">
                              {quoteCard.expiresOnLabel ?? QUOTE_REVISED_EXPIRES_ON_LABEL}
                            </span>
                            , so check out before then to secure the discount.
                          </p>
                          <p>From here, you can:</p>
                          <ol className="list-decimal pl-5 flex flex-col gap-1">
                            <li>Go to checkout</li>
                            <li>Open a new quote request</li>
                            <li>Revoke this quote to return to draft and edit the order</li>
                          </ol>
                          <p>How would you like to proceed?</p>
                        </div>
                      )}
                      {isGreeting && (
                        <p className="text-[12px] leading-[14.4px] text-[#858585]">
                          AI responses may contain errors. <a href="#" className="underline text-[#858585]">Learn more</a>
                        </p>
                      )}
                    </div>
                  );
                }

                const attachment = attachmentsByMessageId[chatMessage.id];
                const displayUserText = textContent
                  .replace(/\n*\[(?:User attached a file|The user wants to request a quote|Request-quote context|Quote-flow continuation|Quote-request STEP \d|Order is in (?:quote-pending|draft) state|Sales-rep session)[^\]]*\]\n*/g, '')
                  .trim();
                if (!displayUserText && !attachment) return null;

                return (
                  <div
                    key={chatMessage.id}
                    className="chat-message-appear ml-auto max-w-[86%] flex flex-col items-end gap-2"
                  >
                    {attachment && (
                      <div className="relative inline-flex items-center gap-2 pl-2 pr-[40px] py-2 rounded-[12px] bg-[#F5F5F5]">
                        <div
                          className="w-10 h-10 rounded-[6px] flex items-center justify-center"
                          style={{ backgroundColor: attachment.iconBg }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-white">{attachment.icon}</span>
                        </div>
                        <div className="flex flex-col gap-1 justify-center">
                          <span className="max-w-[170px] truncate text-[14px] leading-[16.8px] tracking-[-0.01em] font-semibold text-black">
                            {attachment.name}
                          </span>
                          <span className="text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium text-[#5C5C5C]">
                            {attachment.label}
                          </span>
                        </div>
                      </div>
                    )}
                    {displayUserText && (
                      <div className="rounded-[12px] rounded-tr-none bg-[#F5F5F5] pl-4 pr-8 py-3">
                        <p className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] whitespace-pre-wrap">
                          {displayUserText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {(isChatBusy || isSubmittingQuote || isBulkImporting) && (
                <div className="chat-message-appear w-full flex items-start">
                  <p className="thinking-gradient text-[14px] leading-5 tracking-[-0.01em] font-medium">
                    {isCanvasUpdating ? 'Editing quote…' : 'Thinking…'}
                  </p>
                </div>
              )}

              {chatError && (
                <div className="chat-message-appear w-full text-[14px] leading-5 tracking-[-0.01em] text-[#D93025]">
                  <p className="font-semibold">Couldn’t reach the assistant.</p>
                  <p className="mt-1 text-[#1F1F1F]">{chatError}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className={`relative ${composerMinHeightClass} max-h-[320px] rounded-[20px] border border-[#E0E0E0] bg-white px-[12px] pb-[12px] transition-[min-height,padding] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${hasComposerPills ? 'pt-[12px]' : 'pt-[16px]'}`}>
              <div className="pr-[6px] pb-[44px]">
                {attachedFile && (
                  <div className="mb-[8px] relative inline-flex items-center gap-2 rounded-[12px] bg-[#F5F5F5] pl-2 pr-[60px] py-2">
                    <div className="w-10 h-10 rounded-[6px] flex items-center justify-center" style={{ backgroundColor: getFileMeta(attachedFile).iconBg }}>
                      {isFileUploading ? (
                        <span className="material-symbols-outlined text-[20px] text-white animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-white">{getFileMeta(attachedFile).icon}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 justify-center pr-3">
                      <span className="max-w-[190px] truncate text-[14px] leading-[16.8px] tracking-[-0.01em] font-semibold text-black">{attachedFile.name}</span>
                      <span className="text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium text-[#5C5C5C]">{getFileMeta(attachedFile).label}</span>
                    </div>
                    <button
                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-black text-white flex items-center justify-center"
                      aria-label="Remove attached file"
                      onClick={() => {
                        setAttachedFile(null);
                        setIsFileUploading(false);
                        if (uploadTimeoutRef.current) {
                          window.clearTimeout(uploadTimeoutRef.current);
                          uploadTimeoutRef.current = null;
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                )}
                <div className="relative">
                <textarea
                  ref={messageInputRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onScroll={updateMessageFades}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    handleSendMessage();
                  }}
                  className="message-input-scroll pl-[4px] min-h-[20px] max-h-[232px] w-full bg-transparent resize-none outline-none text-[14px] leading-[20px] tracking-[-0.01em] font-normal text-[#1F1F1F] placeholder:text-[#707070] transition-[height] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                  placeholder={messagePlaceholder}
                />
                {showTopMessageFade && (
                  <div className="pointer-events-none absolute top-0 left-0 right-[6px] h-4 bg-gradient-to-b from-white to-transparent" />
                )}
                {showBottomMessageFade && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-[6px] h-4 bg-gradient-to-t from-white to-transparent" />
                )}
                </div>
              </div>

              <div className="absolute left-[12px] right-[12px] bottom-[12px] h-[40px] flex items-center justify-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    if (nextFile) {
                      attachFile(nextFile);
                    }
                    event.currentTarget.value = '';
                  }}
                />
                <div className="mr-auto flex items-center gap-1 min-w-0">
                  {repMode ? (
                    <button
                      type="button"
                      className="w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors hover:bg-[#F5F5F5] shrink-0"
                      aria-label="Attach file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#707070]">add</span>
                    </button>
                  ) : (
                    <div ref={attachMenuRef} className="relative shrink-0">
                      {isAttachMenuOpen && (
                        <div
                          role="menu"
                          aria-label="Add to message"
                          className="attach-menu-appear absolute bottom-full left-0 mb-2 w-[220px] origin-bottom-left rounded-[12px] bg-white border border-[#EBEBEB] py-1 z-10"
                          style={{ boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.06)' }}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F] hover:bg-[#F5F5F5] transition-colors"
                            onClick={() => {
                              setIsAttachMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px] text-[#5C5C5C]">attach_file</span>
                            Import files
                          </button>
                          <div className="my-1 h-px bg-[#EBEBEB]" />
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F] hover:bg-[#F5F5F5] transition-colors"
                            onClick={() => {
                              setIsAttachMenuOpen(false);
                              handleRequestQuoteClick();
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px] text-[#5C5C5C]">request_quote</span>
                            Request quote
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
                          isAttachMenuOpen ? 'bg-[#EBEBEB]' : 'hover:bg-[#F5F5F5]'
                        }`}
                        aria-label="Add to message"
                        aria-haspopup="menu"
                        aria-expanded={isAttachMenuOpen}
                        onClick={() => setIsAttachMenuOpen((previous) => !previous)}
                      >
                        <span className="material-symbols-outlined text-[20px] text-[#707070]">add</span>
                      </button>
                    </div>
                  )}
                  {!repMode && isRequestQuoteActive && (
                    <button
                      type="button"
                      onClick={clearRequestQuoteContext}
                      aria-label="Remove Request quote"
                      title="Remove Request quote"
                      className="composer-tool-pill group h-[32px] rounded-full pl-[10px] pr-3 inline-flex items-center gap-[6px] text-[#0366DD] shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px] composer-tool-pill__icon-default">request_quote</span>
                      <span
                        className="material-symbols-outlined text-[18px] composer-tool-pill__icon-hover"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                      >
                        cancel
                      </span>
                      <span className="text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium">Request quote</span>
                    </button>
                  )}
                </div>
                <button
                  className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
                    hasSendPayload && !isChatBusy ? 'bg-[#0D0D0D]' : 'bg-[#F5F5F5]'
                  } ${isChatBusy ? 'cursor-not-allowed' : ''}`}
                  aria-label="Send"
                  onClick={handleSendMessage}
                  disabled={!hasSendPayload || isChatBusy}
                >
                  {isChatBusy ? (
                    <span className="material-symbols-outlined text-[20px] text-[#707070] animate-spin">progress_activity</span>
                  ) : (
                    <span className={`material-symbols-outlined text-[20px] ${hasSendPayload ? 'text-white' : 'text-[#ADADAD]'}`}>arrow_upward</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section
        className="relative h-full w-[66.6667vw] shrink-0 bg-white border-l border-[#EBEBEB] flex flex-col"
        style={{
          boxShadow: '-4px 0 12px -1px rgba(0, 0, 0, 0.04)',
        }}
      >
        <main ref={canvasScrollRef} className={`panel-scroll flex-1 bg-white px-[60px] pt-[60px] overflow-y-auto ${isBulkImporting ? 'pb-[40px]' : 'pb-[60px]'}`}>
          {isBulkImporting ? (
            <section className="w-full min-h-full flex items-center justify-center">
              <div className="w-full flex flex-col items-center justify-center gap-5">
                <p className="text-[14px] leading-[16.8px] tracking-[-0.01em] font-normal text-[#707070]">
                  Filling out order...
                </p>
                <div className="w-[342px] h-[6px] rounded-full bg-[#EBEBEB] overflow-hidden">
                  <div
                    className="processing-progress-bar h-full bg-black rounded-r-full"
                    style={{ animationDuration: `${FILLING_OUT_ORDER_DURATION_MS}ms` }}
                  />
                </div>
                <button
                  type="button"
                  className="text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium text-[#0366DD] hover:opacity-80 transition-opacity"
                  onClick={handleCancelBulkImport}
                >
                  Cancel
                </button>
              </div>
            </section>
          ) : (
            <section key={canvasStateKey} className={`w-full flex flex-col gap-[60px] canvas-page-enter ${isCanvasUpdating ? 'canvas-thinking-pulse pointer-events-none' : ''}`}>
              <section className="w-full flex flex-col gap-[60px]">
                <div className="flex items-center justify-between">
                  <span className="text-[32px] leading-[38.4px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">{orderTitle}</span>
                </div>
                {isQuotePending && (
                  <div
                    role="status"
                    className={`quote-status-banner w-full h-[52px] -mt-[20px] -mb-[20px] rounded-full pl-5 pr-2 flex items-center gap-2 ${
                      isQuoteRevised ? 'bg-[#01663F]' : 'bg-[#CC5E01]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px] text-white shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                      aria-hidden="true"
                    >
                      {isQuoteRevised ? 'check_circle' : 'hourglass_top'}
                    </span>
                    <span className="flex-1 min-w-0 text-[14px] leading-5 tracking-[-0.01em] font-medium text-white truncate">
                      {repMode
                        ? isQuoteRevised
                          ? `Revised proposal sent to ${quoteContext?.buyerName ?? 'the buyer'}.`
                          : `Quote pending your review. Expires ${QUOTE_EXPIRES_ON_LABEL} (${QUOTE_EXPIRES_ON_SUFFIX}).`
                        : isQuoteRevised
                        ? 'Your quote request is revised and ready to checkout.'
                        : 'Your quote request has been submitted and is pending review.'}
                    </span>
                    {repMode && isQuoteRevised && (
                      <button
                        type="button"
                        onClick={handleRepRevoke}
                        className="shrink-0 h-[36px] rounded-full px-4 inline-flex items-center text-white text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium bg-white/[0.04] hover:bg-white/15 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col">
                  <div className={`flex items-center ${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Contract</span>
                    <div className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F5F5F5]">
                      <div className="w-6 h-6 rounded-full bg-[#1F1F1F] text-white text-[11px] leading-none font-medium flex items-center justify-center">
                        {sessionContext.contractName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{sessionContext.contractName}</span>
                    </div>
                  </div>

                  <div className={`flex items-center ${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Participants</span>
                    <div className="flex items-center gap-2">
                      <div className="group relative inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F5F5F5]">
                        <div className="w-6 h-6 rounded-full bg-[#1F1F1F] text-white text-[11px] leading-none font-medium flex items-center justify-center">
                          {sessionContext.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{sessionContext.userName}</span>
                        <span
                          role="tooltip"
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-[6px] bg-black px-2 py-1 text-[12px] leading-4 font-medium text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                        >
                          Buyer
                        </span>
                      </div>
                      {isQuoteRevised && (
                        <div className="group relative inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F5F5F5]">
                          <div className="w-6 h-6 rounded-full bg-[#1F1F1F] text-white text-[11px] leading-none font-medium flex items-center justify-center">
                            {QUOTE_SALES_REP_INITIAL}
                          </div>
                          <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{QUOTE_SALES_REP_NAME}</span>
                          <span
                            role="tooltip"
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-[6px] bg-black px-2 py-1 text-[12px] leading-4 font-medium text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                          >
                            Sales Rep
                          </span>
                        </div>
                      )}
                    </div>
                  </div>


                  <div className={`flex items-center ${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Last update</span>
                    <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">
                      {isQuotePending ? QUOTE_LAST_UPDATE_LABEL : 'Oct 14, 2025 - 10:42'}
                    </span>
                  </div>

                  <div className={`flex items-center ${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Promo code</span>
                    {promoCode ? (
                      <WriteBreath
                        as="span"
                        pulseKey={writingPulses['promoCode']}
                        className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]"
                      >
                        {promoCode}
                      </WriteBreath>
                    ) : (
                      renderEmptyPlaceholder()
                    )}
                  </div>

                  <div className={`flex items-center ${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">PO Number</span>
                    {poNumber ? (
                      <WriteBreath
                        as="span"
                        pulseKey={writingPulses['poNumber']}
                        className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]"
                      >
                        {poNumber}
                      </WriteBreath>
                    ) : (
                      renderEmptyPlaceholder()
                    )}
                  </div>

                  <div
                    className={`flex min-w-0 ${
                      comments
                        ? 'items-start py-3 min-h-12'
                        : `items-center ${ORDER_ROW_HEIGHT_CLASS}`
                    }`}
                  >
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Comments</span>
                    {comments ? (
                      <WriteBreath
                        as="p"
                        pulseKey={writingPulses['comments']}
                        className="flex-1 min-w-0 text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]"
                      >
                        {comments}
                      </WriteBreath>
                    ) : (
                      renderEmptyPlaceholder()
                    )}
                  </div>
                </div>
              </section>

              <section className="w-full flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">Items</span>
                    <span className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#ADADAD]">
                      {hasFilledProducts ? String(filledProductsCount) : '0'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[14px] leading-5 tracking-[-0.01em] text-[#707070]">
                    <span>Subtotal</span>
                    {hasFilledProducts ? (
                      <span className="font-medium text-[#1F1F1F]">{productsSubtotalLabel}</span>
                    ) : (
                      renderEmptyValue('$0.00', undefined, 'left')
                    )}
                  </div>
                </div>
                {hasFilledProducts ? (
                  <div className="w-full flex-1">
                    <div className="flex flex-col">
                      <div className={`${ORDER_ROW_HEADER_CLASS} border-b border-[#EBEBEB] flex items-center text-[14px] leading-5 tracking-[-0.01em] text-[#707070]`}>
                        <span className="flex-1">Line item details</span>
                        <span className={`${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Quantity</span>
                        {(repMode || isQuoteRevised) && (
                          <span className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Discount</span>
                        )}
                        <span className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Unit price</span>
                        <span className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Subtotal</span>
                      </div>

                      {displayedProducts.map((item, index) => (
                        <article
                          key={item.id}
                          className={`relative py-5 flex flex-col gap-3 border-b border-[#EBEBEB] ${
                            disappearingProductIds.includes(item.id)
                              ? 'product-row-disappear'
                              : animatingProductIds.includes(item.id)
                              ? 'product-row-appear'
                              : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="flex-1 flex items-center gap-5 min-w-0">
                              <div className="w-12 h-12 rounded-[4px] bg-[#F3F3F3] overflow-hidden flex items-center justify-center shrink-0">
                                <img
                                  src="/product-phone-base.png"
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  style={{ filter: PRODUCT_THUMBNAIL_FILTERS[index % PRODUCT_THUMBNAIL_FILTERS.length] }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{item.name}</p>
                                <p className="mt-1 text-[14px] leading-5 tracking-[-0.01em] font-normal text-[#707070]">{item.sku}</p>
                              </div>
                            </div>

                            <WriteBreath
                              as="div"
                              pulseKey={writingPulses[`item:${item.id}`]}
                              className={`${repMode ? 'w-[120px]' : 'w-[100px]'} flex justify-end`}
                            >
                              <QuantityStepper
                                value={getProductQuantity(item)}
                                onChange={(next) => setProductQuantity(item.id, next)}
                                disabled={(isQuotePending && !repMode) || isRepCanvasLocked}
                              />
                            </WriteBreath>
                            {repMode && (
                              <div className="ml-3 w-[120px] flex justify-end">
                                <DiscountStepper
                                  value={getRepDiscountPercentInt(item)}
                                  onChange={(next) => setProductDiscountPercent(item.id, next)}
                                  disabled={isRepCanvasLocked}
                                />
                              </div>
                            )}
                            {!repMode && isQuoteRevised && (
                              <div className="ml-3 w-[100px] text-right text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#01663F]">
                                {getProductDiscountPercent(item) > 0
                                  ? `${Math.round(getProductDiscountPercent(item) * 100)}%`
                                  : ''}
                              </div>
                            )}
                            <div className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} flex flex-col items-end text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]`}>
                              {repMode ? (
                                <>
                                  {isProductEditedByRep(item) && (
                                    <span className="text-[12px] leading-4 text-[#ADADAD] line-through tabular-nums">
                                      {item.unitPrice}
                                    </span>
                                  )}
                                  <EditablePriceInput
                                    value={getEffectiveUnitPriceValue(item)}
                                    onCommit={(next) => setProductEffectiveUnitPrice(item, next)}
                                    ariaLabel={`Unit price for ${item.name}`}
                                    disabled={isRepCanvasLocked}
                                  />
                                </>
                              ) : getProductDiscountPercent(item) > 0 ? (
                                <>
                                  <span className="text-[12px] leading-4 text-[#707070] line-through">{item.unitPrice}</span>
                                  <span className="font-normal text-[#01663F]">{formatCurrency(getEffectiveUnitPriceValue(item))}</span>
                                </>
                              ) : (
                                <span className="font-normal">{item.unitPrice}</span>
                              )}
                            </div>
                            <div className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} flex flex-col items-end text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]`}>
                              {repMode ? (
                                <>
                                  {isProductEditedByRep(item) && (
                                    <span className="text-[12px] leading-4 text-[#ADADAD] line-through tabular-nums">
                                      {formatCurrency(getOriginalProductSubtotalValue(item))}
                                    </span>
                                  )}
                                  <EditablePriceInput
                                    value={getProductSubtotalValue(item)}
                                    onCommit={(next) => setProductSubtotalValue(item, next)}
                                    bold
                                    ariaLabel={`Subtotal for ${item.name}`}
                                    disabled={isRepCanvasLocked}
                                  />
                                </>
                              ) : getProductDiscountPercent(item) > 0 ? (
                                <>
                                  <span className="text-[12px] leading-4 text-[#707070] line-through">{formatCurrency(getOriginalProductSubtotalValue(item))}</span>
                                  <span className="font-medium text-[#01663F]">{computeProductSubtotal(item)}</span>
                                </>
                              ) : (
                                <span className="font-medium">{computeProductSubtotal(item)}</span>
                              )}
                            </div>
                          </div>

                          <div className="pl-[68px] flex flex-col gap-1 text-[14px] leading-5 tracking-[-0.01em] font-normal text-[#707070]">
                            <p>{item.shipTo}</p>
                            <p>
                              <span>{item.accounting}</span>
                              {item.extraCount && <span className="text-[#0366DD] ml-1">{item.extraCount}</span>}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                    {activeProducts.length > 5 && (
                      <div ref={showMoreLessButtonRef} className="mt-3 w-full flex items-center">
                        <button
                          className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#0366DD] hover:opacity-80 transition-opacity"
                          onClick={hasMoreProductsToShow ? handleShowMoreProducts : handleShowLessProducts}
                        >
                          {hasMoreProductsToShow ? `Show ${nextProductsBatchSize} more line items` : 'Show less line items'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className={`${ORDER_ROW_HEADER_CLASS} border-b border-[#EBEBEB] flex items-center text-[14px] leading-5 tracking-[-0.01em] text-[#707070]`}>
                      <span className="flex-1">Line item details</span>
                      <span className={`${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Quantity</span>
                      {(repMode || isQuoteRevised) && (
                        <span className={`ml-3 ${repMode ? 'w-[120px]' : 'w-[100px]'} text-right`}>Discount</span>
                      )}
                      <span className="ml-3 w-[100px] text-right">Unit price</span>
                      <span className="ml-3 w-[100px] text-right">Subtotal</span>
                    </div>
                    <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                      {renderEmptyValue(EMPTY_ITEMS_PLACEHOLDER)}
                      <button
                        type="button"
                        className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#0366DD] hover:opacity-80 transition-opacity"
                        aria-label="Import items from file"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Import
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="w-full flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">Delivery</span>
                  <div className="flex items-center gap-1 text-[14px] leading-5 tracking-[-0.01em] text-[#707070]">
                    <span>Subtotal</span>
                    {hasFilledDelivery ? (
                      <span className="font-medium text-[#1F1F1F]">{deliverySubtotalLabel}</span>
                    ) : (
                      renderEmptyValue('$0.00', undefined, 'left')
                    )}
                  </div>
                </div>

                {hasFilledDelivery ? (
                  <WriteBreath
                    as="div"
                    pulseKey={writingPulses['delivery']}
                    className="flex flex-col"
                  >
                    <div className={`${ORDER_ROW_HEADER_CLASS} border-b border-[#EBEBEB] flex items-center justify-start text-[14px] leading-5 tracking-[-0.01em] text-[#707070]`}>
                      <div className="grid grid-cols-[200px_200px_200px] justify-items-start">
                        <span>Method</span>
                        <span>Address</span>
                        <span>Option</span>
                      </div>
                      <div className="ml-auto w-[200px] grid grid-cols-2 justify-items-end">
                        <span>Items</span>
                        <span>Subtotal</span>
                      </div>
                    </div>
                    {FILLED_DELIVERY_ROWS.map((row, index) => {
                      const isSubtotalZero = parseCurrencyToNumber(row.subtotal) === 0;
                      return (
                        <div
                          key={row.id}
                          className={`relative py-5 flex items-start ${
                            index < FILLED_DELIVERY_ROWS.length - 1 ? 'border-b border-[#EBEBEB]' : ''
                          }`}
                        >
                          <div className="w-[200px] pr-5 flex flex-col gap-1 text-[14px] leading-5 tracking-[-0.01em]">
                            <span className="font-medium text-[#1F1F1F]">{row.shipToLabel}</span>
                          </div>
                          <div className="w-[200px] pr-5 flex flex-col gap-4 text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{row.addressTitle}</span>
                              <span>{row.addressLine1}</span>
                              <span>{row.addressLine2}</span>
                              <span>{row.addressLine3}</span>
                              <span>{row.addressLine4}</span>
                            </div>
                            {row.destinationCode && (
                              <div className="flex flex-col gap-1">
                                <span>{row.destinationCode}</span>
                              </div>
                            )}
                            {(row.contactName || row.contactPhone) && (
                              <div className="flex flex-col gap-1">
                                {row.contactName && <span>{row.contactName}</span>}
                                {row.contactPhone && <span>{row.contactPhone}</span>}
                              </div>
                            )}
                          </div>
                          <div className="w-[200px] pr-5 flex flex-col gap-1 text-[14px] leading-5 tracking-[-0.01em]">
                            <span className="font-medium text-[#1F1F1F]">{row.shippingType}</span>
                            <span className="text-[#707070]">{row.shippingEtaLabel}</span>
                            <span className="text-[#707070]">{row.shippingEtaValue}</span>
                          </div>
                          <div className="ml-auto w-[200px] grid grid-cols-2 justify-items-end text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">
                            <span className="font-normal">{deliveryItemsCountByRowId[row.id] ?? 0}</span>
                            <span className={isSubtotalZero ? 'text-[#707070]' : 'font-medium text-[#1F1F1F]'}>{row.subtotal}</span>
                          </div>
                        </div>
                      );
                    })}
                  </WriteBreath>
                ) : (
                  <div className="flex flex-col">
                    <div className={`${ORDER_ROW_HEADER_CLASS} border-b border-[#EBEBEB] flex items-center justify-start text-[14px] leading-5 tracking-[-0.01em] text-[#707070]`}>
                      <div className="grid grid-cols-[200px_200px_200px] justify-items-start">
                        <span>Method</span>
                        <span>Address</span>
                        <span>Option</span>
                      </div>
                      <div className="ml-auto w-[200px] grid grid-cols-2 justify-items-end">
                        <span>Items</span>
                        <span>Subtotal</span>
                      </div>
                    </div>
                    <div className={`${ORDER_ROW_HEIGHT_CLASS} border-b border-[#EBEBEB] flex items-center justify-start text-[14px] leading-5 tracking-[-0.01em]`}>
                      <div className="grid grid-cols-[200px_200px_200px] items-center justify-items-start">
                        <span className="font-semibold text-[#1F1F1F]">Ship to</span>
                        {shipToDeliveryAddress ? (
                          <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{shipToDeliveryAddress}</span>
                        ) : (
                          renderEmptyPlaceholder()
                        )}
                        {shipToDeliveryOption ? (
                          <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{shipToDeliveryOption}</span>
                        ) : (
                          renderEmptyPlaceholder()
                        )}
                      </div>
                      <div className="ml-auto w-[200px] grid grid-cols-2 justify-items-end">
                        {renderEmptyValue('0', undefined, 'left')}
                        {renderEmptyValue('$0.00', undefined, 'left')}
                      </div>
                    </div>
                    <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center justify-start text-[14px] leading-5 tracking-[-0.01em]`}>
                      <div className="grid grid-cols-[200px_200px_200px] items-center justify-items-start">
                        <span className="font-semibold text-[#1F1F1F]">Pickup</span>
                        {pickupDeliveryAddress ? (
                          <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{pickupDeliveryAddress}</span>
                        ) : (
                          renderEmptyPlaceholder()
                        )}
                        {pickupDeliveryOption ? (
                          <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]">{pickupDeliveryOption}</span>
                        ) : (
                          renderEmptyPlaceholder()
                        )}
                      </div>
                      <div className="ml-auto w-[200px] grid grid-cols-2 justify-items-end">
                        {renderEmptyValue('0', undefined, 'left')}
                        {renderEmptyValue('$0.00', undefined, 'left')}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="w-full flex flex-col gap-5">
                <span className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">Payment</span>
                <div className="flex flex-col">
                  <div
                    className={`${
                      hasPaymentMethod ? 'py-5 items-start' : `${ORDER_ROW_HEIGHT_CLASS} items-center`
                    } flex justify-start border-b border-[#EBEBEB]`}
                  >
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Payment method</span>
                    {hasPaymentMethod ? (
                      <WriteBreath
                        as="div"
                        pulseKey={writingPulses['payment']}
                        className="flex flex-col text-left text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#1F1F1F]"
                      >
                        <span>{FILLED_SUMMARY_DATA.paymentMethod}</span>
                        <span>{FILLED_SUMMARY_DATA.paymentOwner}</span>
                        <span>{FILLED_SUMMARY_DATA.paymentMaskedNumber}</span>
                        <span>{FILLED_SUMMARY_DATA.paymentExpiration}</span>
                        <span>{FILLED_SUMMARY_DATA.paymentCardholder}</span>
                      </WriteBreath>
                    ) : (
                      renderEmptyPlaceholder()
                    )}
                  </div>
                  <div
                    className={`${
                      hasBillingAddress ? 'py-5 items-start' : `${ORDER_ROW_HEIGHT_CLASS} items-center`
                    } flex justify-start`}
                  >
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Billing address</span>
                    {hasBillingAddress ? (
                      <WriteBreath
                        as="div"
                        pulseKey={writingPulses['billing']}
                        className="flex flex-col text-left text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]"
                      >
                        <span className="font-semibold">{FILLED_SUMMARY_DATA.billingTitle}</span>
                        <span className="font-medium">{FILLED_SUMMARY_DATA.billingAddressLine1}</span>
                        <span className="font-medium">{FILLED_SUMMARY_DATA.billingAddressLine2}</span>
                        <span className="font-medium">{FILLED_SUMMARY_DATA.billingAddressLine3}</span>
                        <span className="font-medium">{FILLED_SUMMARY_DATA.billingAddressLine4}</span>
                      </WriteBreath>
                    ) : (
                      renderEmptyPlaceholder()
                    )}
                  </div>
                </div>
              </section>

              <section className="w-full flex flex-col gap-5">
                <span className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">Order totals</span>
                <div className="flex flex-col">
                  <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Subtotal</span>
                    <span className="flex-1 text-right text-[14px] leading-5 tracking-[-0.01em]">
                      {hasFilledProducts ? (
                        <span className="font-medium text-[#1F1F1F]">{productsSubtotalLabel}</span>
                      ) : (
                        renderEmptyValue('$0.00', undefined, 'left')
                      )}
                    </span>
                  </div>
                  {(isQuoteRevised || repMode) && productsDiscountValue > 0 && (
                    <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center border-b border-[#EBEBEB]`}>
                      <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Discount</span>
                      <span className="flex-1 text-right text-[14px] leading-5 tracking-[-0.01em] font-medium text-[#01663F]">
                        {productsDiscountLabel}
                      </span>
                    </div>
                  )}
                  <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center border-b border-[#EBEBEB]`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Shipping</span>
                    <span className="flex-1 text-right text-[14px] leading-5 tracking-[-0.01em]">
                      {hasFilledDelivery ? (
                        <span className="font-medium text-[#1F1F1F]">{deliverySubtotalLabel}</span>
                      ) : (
                        renderEmptyValue('$0.00', undefined, 'left')
                      )}
                    </span>
                  </div>
                  <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center border-b border-black`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Taxes</span>
                    <span className="flex-1 text-right text-[14px] leading-5 tracking-[-0.01em]">
                      {isOrderStarted ? (
                        <span className="font-medium text-[#1F1F1F]">{formatCurrency(taxesValue)}</span>
                      ) : (
                        renderEmptyValue('$0.00', undefined, 'left')
                      )}
                    </span>
                  </div>
                  <div className={`${ORDER_ROW_HEIGHT_CLASS} flex items-center`}>
                    <span className="w-[200px] shrink-0 text-[14px] leading-5 tracking-[-0.01em] font-semibold text-[#1F1F1F]">Total</span>
                    <span className="flex-1 text-right">
                      {isOrderStarted ? (
                        <span className="text-[20px] leading-[24px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">{orderTotalLabel}</span>
                      ) : (
                        renderEmptyValue('$0.00', 'text-[20px] leading-[24px] tracking-[-0.04em]', 'left')
                      )}
                    </span>
                  </div>
                </div>
              </section>
            </section>
          )}
        </main>

        {!isBulkImporting && (
        <footer className="h-[72px] bg-white border-t border-[#EBEBEB] px-5 py-5 flex items-center justify-between">
            <div className="flex-1 h-[40px] flex items-center gap-[12px]">
              <div className="flex items-center gap-1 text-[14px] leading-[20px] tracking-[-0.01em] font-normal text-[#707070]">
                <span>Items</span>
                {hasFilledProducts ? (
                  <span className="font-medium text-[#1F1F1F]">{String(filledProductsCount)}</span>
                ) : (
                  renderEmptyValue('0')
                )}
              </div>
              <div className="flex items-center gap-1 text-[14px] leading-[20px] tracking-[-0.01em] font-normal text-[#707070]">
                <span>Order total</span>
                {isOrderStarted ? (
                  <span className="font-medium text-[#1F1F1F]">{orderTotalLabel}</span>
                ) : (
                  renderEmptyValue('$0.00')
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {repMode && (
                <button
                  type="button"
                  onClick={handleSendToBuyer}
                  disabled={isQuoteRevised || !hasRepEdits}
                  className="h-[40px] rounded-[20px] bg-white border border-[#E0E0E0] px-5 inline-flex items-center text-[#1F1F1F] text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                >
                  Send quote
                </button>
              )}
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="h-[40px] rounded-[20px] bg-[#0366DD] px-5 pr-3 inline-flex items-center gap-2 text-white text-[14px] leading-[16.8px] tracking-[-0.01em] font-medium hover:bg-[#0255B8] transition-colors"
              >
                Checkout
                <span className="material-symbols-outlined text-[20px] text-white">arrow_forward</span>
              </button>
            </div>
          </footer>
        )}
      </section>
      </div>

      {isFileDragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <div className="w-[272px] flex flex-col items-center gap-4">
            <img src="/Illustration.svg" alt="" className="w-[80px] h-auto" />
            <h3 className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#0D0D0D]">Drop file</h3>
            <p className="text-center whitespace-nowrap text-[14px] leading-[16.8px] tracking-[-0.01em] text-[#0D0D0D]">
              Drop your file here to fill your order in bulk
            </p>
          </div>
        </div>
      )}

      <CheckoutConfirmDialog
        open={isCheckoutConfirmOpen}
        onCancel={() => setIsCheckoutConfirmOpen(false)}
        onConfirm={handleConfirmCheckout}
      />

      <SendToBuyerConfirmDialog
        open={isSendToBuyerOpen}
        proposedComment={latestProposedComment}
        onCancel={() => setIsSendToBuyerOpen(false)}
        onConfirm={handleConfirmSendToBuyer}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [route, setRoute] = useState<OrderBuilderRoute>(() => parseOrderBuilderRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(parseOrderBuilderRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.active) {
    return <OrderBuilderPage key={route.quoteSlug ?? 'default'} quoteSlug={route.quoteSlug} />;
  }

  const handleOpenQuote = (slug: string) => {
    const orderBuilderUrl = `${window.location.origin}${window.location.pathname}#order-builder?quote=${encodeURIComponent(slug)}`;
    window.open(orderBuilderUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-screen bg-white">
      <SalesRepHome onOpenQuote={handleOpenQuote} />
    </div>
  );
};

export default App;
