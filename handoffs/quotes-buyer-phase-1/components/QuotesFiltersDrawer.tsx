import React, { useEffect, useState } from 'react';
import DateRangeField from './DateRangeField';
import CurrencyInput from './CurrencyInput';
import StatusSelect from './StatusSelect';
import UserSelect from './UserSelect';
import { EMPTY_FILTERS, QuotesFilters } from '../lib/quoteFilters';

interface QuotesFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: QuotesFilters;
  onApply: (filters: QuotesFilters) => void;
}

const QuotesFiltersDrawer: React.FC<QuotesFiltersDrawerProps> = ({
  isOpen,
  onClose,
  initialFilters,
  onApply,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [draft, setDraft] = useState<QuotesFilters>(initialFilters);

  // Re-seed the draft from the currently applied filters every time the
  // drawer is opened, so closing without Apply discards in-progress changes.
  useEffect(() => {
    if (isOpen) setDraft(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateDraft = (patch: Partial<QuotesFilters>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const handleClearAll = () => setDraft(EMPTY_FILTERS);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const animationDuration = 550;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsAnimating(true), 20);
      return () => clearTimeout(timer);
    }
    setIsAnimating(false);
    const timer = setTimeout(() => setIsVisible(false), animationDuration);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-500 ease-linear ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`
          relative h-full w-1/3 min-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden
          transition-transform ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ transitionDuration: `${animationDuration}ms` }}
      >
        <div className="h-[68px] px-[20px] pl-[60px] flex items-center justify-between border-b border-[#EBEBEB] shrink-0">
          <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-black">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#F5F5F5] flex items-center justify-center text-gray-700 transition-colors"
            aria-label="Close filters"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[60px] pt-[40px] pb-[40px]">
          <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-2">
              <label className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">Status</label>
              <StatusSelect
                selectedStatuses={draft.statuses}
                onChange={(statuses) => updateDraft({ statuses })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">Created by</label>
              <UserSelect
                selectedUserIds={draft.createdByIds}
                onChange={(createdByIds) => updateDraft({ createdByIds })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">Creation date</label>
              <DateRangeField
                startDate={draft.creationStart}
                endDate={draft.creationEnd}
                onStartDateChange={(creationStart) => updateDraft({ creationStart })}
                onEndDateChange={(creationEnd) => updateDraft({ creationEnd })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">Expiration date</label>
              <DateRangeField
                startDate={draft.expirationStart}
                endDate={draft.expirationEnd}
                onStartDateChange={(expirationStart) => updateDraft({ expirationStart })}
                onEndDateChange={(expirationEnd) => updateDraft({ expirationEnd })}
                minDate={draft.creationStart}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F]">Total (USD)</label>
              <div className="flex border border-[#D6D6D6] rounded-[4px] overflow-hidden hover:border-[#1F1F1F] focus-within:border-[#0366DD] transition-colors">
                <CurrencyInput
                  digits={draft.totalMinDigits}
                  onChange={(totalMinDigits) => updateDraft({ totalMinDigits })}
                  label="Minimum"
                  ariaLabel="Minimum total"
                  className="flex-1 min-w-0 h-[56px] border-r border-[#D6D6D6] bg-white"
                />
                <CurrencyInput
                  digits={draft.totalMaxDigits}
                  onChange={(totalMaxDigits) => updateDraft({ totalMaxDigits })}
                  label="Maximum"
                  ariaLabel="Maximum total"
                  className="flex-1 min-w-0 h-[56px] bg-white"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-[60px] py-[24px] border-t border-[#EBEBEB] shrink-0 flex items-center gap-5">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold tracking-[-0.01em] text-[#0366DD] border border-[#E0E0E0] bg-white hover:bg-[#F5F5F5] transition-colors outline-none"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold tracking-[-0.01em] text-white bg-[#0366DD] hover:bg-[#0255b8] transition-colors outline-none"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotesFiltersDrawer;
