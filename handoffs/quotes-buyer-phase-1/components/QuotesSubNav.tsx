import React from 'react';
import Pagination from './Pagination';

interface QuotesSubNavProps {
  rangeStart?: number;
  rangeEnd?: number;
  total?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onFiltersClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  filterCount?: number;
}

const QuotesSubNav: React.FC<QuotesSubNavProps> = ({
  rangeStart = 1,
  rangeEnd = 10,
  total = 50,
  onPrevious,
  onNext,
  onFiltersClick,
  searchQuery = '',
  onSearchChange,
  filterCount = 0,
}) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center h-[40px] px-4 rounded-full bg-[#F5F5F5] focus-within:bg-white focus-within:border-[#0366DD] border border-transparent transition-all w-[400px]">
          <span className="material-symbols-outlined text-[20px] text-gray-900 mr-3 select-none">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search by any order detail"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-[#5C5C5C]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-500 transition-colors"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onFiltersClick}
          className={`h-[40px] pl-[14px] rounded-full text-[#0366DD] font-medium border border-[#E0E0E0] bg-white transition-all duration-300 hover:bg-[#F5F5F5] outline-none flex items-center gap-2 shrink-0 ${filterCount > 0 ? 'pr-[8px]' : 'pr-[20px]'}`}
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          <span className="text-[14px] tracking-[-0.01em]">Filters</span>
          {filterCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-[6px] rounded-full bg-[#0366DD] text-white text-[12px] leading-none font-semibold tracking-[-0.01em]"
              aria-label={`${filterCount} active filter${filterCount === 1 ? '' : 's'}`}
            >
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <div className="shrink-0">
        <Pagination
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={total}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
    </div>
  );
};

export default QuotesSubNav;
