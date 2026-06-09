import React from 'react';

interface PaginationProps {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const Pagination: React.FC<PaginationProps> = ({ rangeStart, rangeEnd, total, onPrevious, onNext }) => (
  <div className="flex items-center gap-3">
    <span className="text-[14px] tracking-[-0.01em] text-[#5C5C5C] whitespace-nowrap">
      {rangeStart} — {rangeEnd} of {total}
    </span>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous page"
        className="w-[40px] h-[40px] rounded-full hover:bg-[#F5F5F5] transition-colors flex items-center justify-center text-[#1F1F1F]"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next page"
        className="w-[40px] h-[40px] rounded-full hover:bg-[#F5F5F5] transition-colors flex items-center justify-center text-[#1F1F1F]"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  </div>
);

export default Pagination;
