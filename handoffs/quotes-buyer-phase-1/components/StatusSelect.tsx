import React, { useEffect, useRef, useState } from 'react';

export type QuoteStatus = 'Requested' | 'Reviewed' | 'Declined' | 'Expired';

const STATUSES: QuoteStatus[] = ['Requested', 'Reviewed', 'Declined', 'Expired'];

const STATUS_BG: Record<QuoteStatus, string> = {
  Requested: '#FFEDCD',
  Reviewed: '#E9FCE3',
  Declined: '#FFEDEA',
  Expired: '#F5F5F5',
};

const POPOVER_ANIMATION_MS = 180;

interface StatusSelectProps {
  selectedStatuses: QuoteStatus[];
  onChange: (next: QuoteStatus[]) => void;
}

const StatusChip: React.FC<{ status: QuoteStatus; onRemove: () => void }> = ({
  status,
  onRemove,
}) => (
  <span
    className="inline-flex items-center gap-1 pl-3 pr-1 py-[3px] rounded-full text-[12px] leading-4 tracking-[-0.01em] text-black select-none"
    style={{ backgroundColor: STATUS_BG[status] }}
  >
    <span>{status}</span>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={`Remove ${status}`}
      className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-black/80 hover:bg-black/10 active:bg-black/15 transition-colors duration-150"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>
        close
      </span>
    </button>
  </span>
);

const Checkbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={`
      w-[18px] h-[18px] rounded-[2px] flex items-center justify-center shrink-0
      transition-colors duration-150
      ${checked ? 'bg-[#0366DD] border-2 border-[#0366DD]' : 'border-2 border-[#5C5C5C] bg-white'}
    `}
  >
    {checked && (
      <span
        className="material-symbols-outlined text-white"
        style={{ fontSize: 14, fontVariationSettings: "'FILL' 1, 'wght' 700", lineHeight: 1 }}
      >
        check
      </span>
    )}
  </span>
);

const StatusSelect: React.FC<StatusSelectProps> = ({ selectedStatuses, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [popoverIn, setPopoverIn] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedFilter = filterText.trim().toLowerCase();
  const visibleStatuses = trimmedFilter
    ? STATUSES.filter((s) => s.toLowerCase().includes(trimmedFilter))
    : STATUSES;

  const toggleStatus = (status: QuoteStatus) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : STATUSES.filter((s) => selectedStatuses.includes(s) || s === status);
    onChange(next);
    setFilterText('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const openAndFocus = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setFilterText('');
      inputRef.current?.blur();
      return;
    }
    if (event.key === 'Backspace' && filterText === '' && selectedStatuses.length > 0) {
      event.preventDefault();
      onChange(selectedStatuses.slice(0, -1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (visibleStatuses.length > 0) toggleStatus(visibleStatuses[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPopoverMounted(true);
      const t = setTimeout(() => setPopoverIn(true), 16);
      return () => clearTimeout(t);
    }
    setPopoverIn(false);
    const t = setTimeout(() => setPopoverMounted(false), POPOVER_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const hasSelection = selectedStatuses.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={openAndFocus}
        className={`
          w-full min-h-[56px] px-4 py-2 rounded-[4px] border bg-white cursor-text
          flex items-center gap-2
          transition-colors duration-200 ease-out
          ${isOpen ? 'border-[#0366DD]' : 'border-[#D6D6D6] hover:border-[#1F1F1F]'}
        `}
      >
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {selectedStatuses.map((status) => (
            <StatusChip
              key={status}
              status={status}
              onRemove={() => toggleStatus(status)}
            />
          ))}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            value={filterText}
            onChange={(event) => {
              setFilterText(event.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={hasSelection ? '' : 'Select'}
            className="flex-1 min-w-[60px] bg-transparent outline-none text-[14px] tracking-[-0.01em] text-[#1F1F1F] placeholder:text-[#5C5C5C] py-1"
          />
        </div>
      </div>

      {popoverMounted && (
        <div
          role="listbox"
          aria-multiselectable
          className={`
            absolute left-0 right-0 z-20 mt-1 origin-top
            bg-white border border-[#D6D6D6] rounded-[4px] overflow-hidden
            shadow-[0_8px_24px_rgba(0,0,0,0.08)]
            transition-all ease-out
            ${popoverIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]'}
          `}
          style={{ transitionDuration: `${POPOVER_ANIMATION_MS}ms` }}
        >
          {visibleStatuses.length === 0 ? (
            <div className="px-4 py-3 text-[14px] tracking-[-0.01em] text-[#5C5C5C]">
              No statuses match
            </div>
          ) : (
            visibleStatuses.map((status) => {
              const checked = selectedStatuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggleStatus(status)}
                  className="w-full h-12 px-4 flex items-center gap-3 text-left transition-colors duration-150 hover:bg-[#F5F5F5] active:bg-[#EBEBEB] outline-none"
                >
                  <Checkbox checked={checked} />
                  <span className="text-[14px] tracking-[-0.01em] text-[#1F1F1F]">{status}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StatusSelect;
