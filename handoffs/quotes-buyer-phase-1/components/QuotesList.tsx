import React from 'react';

export type QuoteStatus = 'Requested' | 'Reviewed' | 'Declined' | 'Expired';

export interface Quote {
  id: string;
  number: string;
  subtitle: string;
  createdBy: string;
  creationDate: string;
  expiresLabel: 'Expires on' | 'Expired on';
  expiresValue: string;
  status: QuoteStatus;
  items: number;
  total: string;
}

export const QUOTES: Quote[] = [
  {
    id: 'q-01',
    number: '789456123-001',
    subtitle: 'Supplies Check for the First Quarter of 2026',
    createdBy: 'Donald Green',
    creationDate: 'May 22, 2026',
    expiresLabel: 'Expires on',
    expiresValue: 'Jun 21, 2026 · 30 days left',
    status: 'Requested',
    items: 87,
    total: '$24,180.50',
  },
  {
    id: 'q-02',
    number: '123456789-001',
    subtitle: 'Quarterly Office Supplies Update for Q1 2026',
    createdBy: 'Donald Green',
    creationDate: 'May 19, 2026',
    expiresLabel: 'Expires on',
    expiresValue: 'Jun 18, 2026 · 27 days left',
    status: 'Reviewed',
    items: 156,
    total: '$42,890.75',
  },
  {
    id: 'q-03',
    number: '987654321-002',
    subtitle: '2026 Q1 Office Supply Needs Assessment',
    createdBy: 'Ethan Parker',
    creationDate: 'May 12, 2026',
    expiresLabel: 'Expires on',
    expiresValue: 'Jun 11, 2026 · 20 days left',
    status: 'Reviewed',
    items: 64,
    total: '$15,720.00',
  },
  {
    id: 'q-04',
    number: '456789123-003',
    subtitle: 'Planning Office Supplies for Q1 2026',
    createdBy: 'Mia Thompson',
    creationDate: 'May 5, 2026',
    expiresLabel: 'Expires on',
    expiresValue: 'Jun 4, 2026 · 13 days left',
    status: 'Declined',
    items: 38,
    total: '$8,495.20',
  },
  {
    id: 'q-05',
    number: '321654987-004',
    subtitle: 'Q1 2026 Office Supply Inventory Review',
    createdBy: 'Donald Green',
    creationDate: 'Apr 21, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'May 21, 2026',
    status: 'Expired',
    items: 203,
    total: '$57,612.40',
  },
  {
    id: 'q-06',
    number: '654321789-005',
    subtitle: 'Office supplies and materials for the first quarter of 2026',
    createdBy: 'Donald Green',
    creationDate: 'Apr 15, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'May 15, 2026',
    status: 'Expired',
    items: 92,
    total: '$26,043.18',
  },
  {
    id: 'q-07',
    number: '789123456-006',
    subtitle: '2026 Q1 Office Supplies Replenishment Plan',
    createdBy: 'Liam Johnson',
    creationDate: 'Apr 10, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'May 10, 2026',
    status: 'Expired',
    items: 145,
    total: '$38,725.90',
  },
  {
    id: 'q-08',
    number: '159753486-007',
    subtitle: 'First Quarter 2026 Office Supply Checklist',
    createdBy: 'Sophia Davis',
    creationDate: 'Apr 5, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'May 5, 2026',
    status: 'Expired',
    items: 71,
    total: '$19,860.55',
  },
  {
    id: 'q-09',
    number: '753159864-008',
    subtitle: 'Essential Office Supplies for Q1 2026',
    createdBy: 'Donald Green',
    creationDate: 'Mar 28, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'Apr 27, 2026',
    status: 'Expired',
    items: 124,
    total: '$33,407.62',
  },
  {
    id: 'q-10',
    number: '246813579-009',
    subtitle: 'Q1 2026 Office Supplies Overview',
    createdBy: 'Noah Wilson',
    creationDate: 'Mar 20, 2026',
    expiresLabel: 'Expired on',
    expiresValue: 'Apr 19, 2026',
    status: 'Expired',
    items: 49,
    total: '$11,238.04',
  },
];

const STATUS_BG: Record<QuoteStatus, string> = {
  Requested: '#FFEDCD',
  Reviewed: '#E9FCE3',
  Declined: '#FFEDEA',
  Expired: '#F5F5F5',
};

const StatusPill: React.FC<{ status: QuoteStatus }> = ({ status }) => (
  <span
    className="inline-flex items-center px-3 py-[5px] rounded-full text-[12px] leading-4 tracking-[-0.01em] text-black"
    style={{ backgroundColor: STATUS_BG[status] }}
  >
    {status}
  </span>
);

const InfoPair: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[14px] leading-5 tracking-[-0.01em] text-[#707070]">{label}</span>
    <div className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">{children}</div>
  </div>
);

const QuoteCard: React.FC<{ quote: Quote; onOpen?: () => void }> = ({ quote, onOpen }) => {
  const interactive = typeof onOpen === 'function';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.();
    }
  };

  return (
    <article
      className="p-5 transition-colors duration-150 hover:bg-[#F8F8F8] cursor-pointer focus:outline-none focus-visible:bg-[#F8F8F8]"
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpen : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      aria-label={interactive ? `Open quote ${quote.number}` : undefined}
    >
      <div className="flex gap-10 h-[150px]">
        <div className="flex gap-10 flex-1 min-w-0">
          <div className="w-[300px] shrink-0 flex flex-col gap-0.5">
            <span className="text-[14px] leading-5 tracking-[-0.01em] font-semibold text-black">
              {quote.number}
            </span>
            <span className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] truncate">
              {quote.subtitle}
            </span>
          </div>

          <div className="w-[190px] shrink-0 flex flex-col gap-3">
            <InfoPair label="Created by">{quote.createdBy}</InfoPair>
            <InfoPair label="Creation date">{quote.creationDate}</InfoPair>
            <InfoPair label={quote.expiresLabel}>{quote.expiresValue}</InfoPair>
          </div>
        </div>

        <div className="w-[111px] shrink-0 flex flex-col justify-between items-end">
          <StatusPill status={quote.status} />
          <div className="flex flex-col gap-0.5 items-end">
            <div className="flex items-center gap-1">
              <span className="text-[14px] leading-5 tracking-[-0.01em] text-[#707070]">Items</span>
              <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-black">
                {quote.items}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[14px] leading-5 tracking-[-0.01em] text-[#707070]">Total</span>
              <span className="text-[14px] leading-5 tracking-[-0.01em] font-medium text-black">
                {quote.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

interface QuotesListProps {
  quotes?: Quote[];
  searchQuery?: string;
  onClearSearch?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const QuotesList: React.FC<QuotesListProps> = ({
  quotes = QUOTES,
  searchQuery = '',
  onClearSearch,
  hasActiveFilters = false,
  onClearFilters,
}) => {
  const handleOpenQuote = (quote: Quote) => {
    const { origin, pathname, search } = window.location;
    const url = `${origin}${pathname}${search}#order-builder?quote=${encodeURIComponent(quote.id)}&state=pending-quote`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (quotes.length === 0) {
    let subtitle = 'Try adjusting your search or filters.';
    if (searchQuery && hasActiveFilters) {
      subtitle = `We couldn't find any quote matching "${searchQuery}" with the current filters.`;
    } else if (searchQuery) {
      subtitle = `We couldn't find any quote matching "${searchQuery}". Try a different search term.`;
    } else if (hasActiveFilters) {
      subtitle = `We couldn't find any quote matching the selected filters. Try adjusting them.`;
    }

    return (
      <div className="border-t border-b border-[#EBEBEB] py-[80px] flex flex-col items-center justify-center text-center">
        <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-[28px] text-[#5C5C5C]">search_off</span>
        </div>
        <h2 className="text-[18px] leading-[24px] tracking-[-0.02em] font-semibold text-[#1F1F1F]">
          No results found
        </h2>
        <p className="mt-1 text-[14px] leading-5 tracking-[-0.01em] text-[#5C5C5C] max-w-[420px]">
          {subtitle}
        </p>
        {(searchQuery || hasActiveFilters) && (
          <div className="mt-5 flex items-center gap-3">
            {onClearSearch && searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="h-[40px] px-[20px] rounded-full text-[#0366DD] font-medium border border-[#E0E0E0] bg-white transition-all duration-300 hover:bg-[#F5F5F5] outline-none"
              >
                <span className="text-[14px] tracking-[-0.01em]">Clear search</span>
              </button>
            )}
            {onClearFilters && hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="h-[40px] px-[20px] rounded-full text-[#0366DD] font-medium border border-[#E0E0E0] bg-white transition-all duration-300 hover:bg-[#F5F5F5] outline-none"
              >
                <span className="text-[14px] tracking-[-0.01em]">Clear filters</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#EBEBEB] border-t border-b border-[#EBEBEB]">
      {quotes.map((quote, index) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          onOpen={index === 0 ? () => handleOpenQuote(quote) : undefined}
        />
      ))}
    </div>
  );
};

export default QuotesList;
