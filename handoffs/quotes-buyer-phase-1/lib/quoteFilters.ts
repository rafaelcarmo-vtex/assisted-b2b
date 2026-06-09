import { USERS } from '../data/users';
import type { Quote, QuoteStatus } from '../components/QuotesList';

export interface QuotesFilters {
  statuses: QuoteStatus[];
  createdByIds: string[];
  creationStart: Date | null;
  creationEnd: Date | null;
  expirationStart: Date | null;
  expirationEnd: Date | null;
  totalMinDigits: string;
  totalMaxDigits: string;
}

export const EMPTY_FILTERS: QuotesFilters = {
  statuses: [],
  createdByIds: [],
  creationStart: null,
  creationEnd: null,
  expirationStart: null,
  expirationEnd: null,
  totalMinDigits: '',
  totalMaxDigits: '',
};

/** Counts each filter section that has at least one value applied. */
export const countActiveFilters = (f: QuotesFilters): number => {
  let count = 0;
  if (f.statuses.length > 0) count++;
  if (f.createdByIds.length > 0) count++;
  if (f.creationStart || f.creationEnd) count++;
  if (f.expirationStart || f.expirationEnd) count++;
  if (f.totalMinDigits !== '' || f.totalMaxDigits !== '') count++;
  return count;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Parse a creation date like "May 22, 2026, 3:15PM" to a Date (date-only). */
export const parseQuoteCreationDate = (raw: string): Date | null => {
  const datePart = raw.split(',').slice(0, 2).join(',').trim();
  const parsed = new Date(datePart);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/** Parse an expires value like "Jun 21, 2026 · 30 days left" or "May 21, 2026". */
export const parseQuoteExpiresDate = (raw: string): Date | null => {
  const datePart = raw.split('·')[0].trim();
  const parsed = new Date(datePart);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/** Parse "$24,180.50" into 24180.5. */
export const parseQuoteTotal = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
};

/** Convert cents-shifting digits like "126887" into 1268.87. */
export const digitsToNumber = (digits: string): number => {
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

export const applyQuoteFilters = (
  quotes: Quote[],
  filters: QuotesFilters,
): Quote[] => {
  if (countActiveFilters(filters) === 0) return quotes;

  const selectedUserNames = new Set(
    USERS.filter((u) => filters.createdByIds.includes(u.id)).map((u) => u.name),
  );

  return quotes.filter((quote) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(quote.status)) {
      return false;
    }

    if (filters.createdByIds.length > 0 && !selectedUserNames.has(quote.createdBy)) {
      return false;
    }

    if (filters.creationStart || filters.creationEnd) {
      const created = parseQuoteCreationDate(quote.creationDate);
      if (!created) return false;
      if (filters.creationStart && created < startOfDay(filters.creationStart)) return false;
      if (filters.creationEnd && created > endOfDay(filters.creationEnd)) return false;
    }

    if (filters.expirationStart || filters.expirationEnd) {
      const expires = parseQuoteExpiresDate(quote.expiresValue);
      if (!expires) return false;
      if (filters.expirationStart && expires < startOfDay(filters.expirationStart)) return false;
      if (filters.expirationEnd && expires > endOfDay(filters.expirationEnd)) return false;
    }

    if (filters.totalMinDigits !== '' || filters.totalMaxDigits !== '') {
      const total = parseQuoteTotal(quote.total);
      if (filters.totalMinDigits !== '' && total < digitsToNumber(filters.totalMinDigits)) {
        return false;
      }
      if (filters.totalMaxDigits !== '' && total > digitsToNumber(filters.totalMaxDigits)) {
        return false;
      }
    }

    return true;
  });
};
