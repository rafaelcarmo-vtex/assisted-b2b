import React, { useEffect, useRef, useState } from 'react';

interface DateRangeFieldProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  /** Dates on or before this value are disabled (used to enforce expiration > creation). */
  minDate?: Date | null;
}

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const POPOVER_ANIMATION_MS = 180;

const stripTime = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date, b: Date) => stripTime(a).getTime() === stripTime(b).getTime();
const isBefore = (a: Date, b: Date) => stripTime(a).getTime() < stripTime(b).getTime();
const isAfter = (a: Date, b: Date) => stripTime(a).getTime() > stripTime(b).getTime();

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth() + n, 1);

const formatDateParts = (date: Date) => ({
  dd: String(date.getDate()).padStart(2, '0'),
  mm: String(date.getMonth() + 1).padStart(2, '0'),
  yyyy: String(date.getFullYear()),
});

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

interface CalendarProps {
  selectedDate: Date | null;
  viewMonth: Date;
  onDayClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  isDateDisabled?: (date: Date) => boolean;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  viewMonth,
  onDayClick,
  onMonthChange,
  isDateDisabled,
}) => {
  const [transitionKey, setTransitionKey] = useState(0);
  const [transitionDir, setTransitionDir] = useState<'left' | 'right' | null>(null);

  const handlePrevMonth = () => {
    setTransitionDir('right');
    setTransitionKey((k) => k + 1);
    onMonthChange(addMonths(viewMonth, -1));
  };

  const handleNextMonth = () => {
    setTransitionDir('left');
    setTransitionKey((k) => k + 1);
    onMonthChange(addMonths(viewMonth, 1));
  };

  const monthStart = startOfMonth(viewMonth);
  const firstDayOfWeek = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  const prevMonthLastDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0).getDate();

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({
      date: new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day),
      isCurrentMonth: true,
    });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      isCurrentMonth: false,
    });
  }
  const lastRowAllNext = cells.slice(35).every((c) => !c.isCurrentMonth);
  const finalCells = lastRowAllNext ? cells.slice(0, 35) : cells;

  return (
    <div className="bg-white border border-[#D6D6D6] rounded-[4px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[16px] tracking-[-0.01em] font-semibold text-black">
          {formatMonthYear(viewMonth)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-7 h-7 rounded-full hover:bg-[#F5F5F5] active:bg-[#EBEBEB] flex items-center justify-center transition-colors duration-150 text-[#1F1F1F]"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-7 h-7 rounded-full hover:bg-[#F5F5F5] active:bg-[#EBEBEB] flex items-center justify-center transition-colors duration-150 text-[#1F1F1F]"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-x-4 mt-3 px-1">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className="h-8 flex items-center justify-center text-[14px] tracking-[-0.01em] text-[#5C5C5C]"
          >
            {d}
          </div>
        ))}
      </div>

      <div
        key={transitionKey}
        className="grid grid-cols-7 gap-x-4 gap-y-2 mt-2 px-1 calendar-month-enter"
        style={{
          ['--enter-from' as string]:
            transitionDir === 'left' ? '8px' : transitionDir === 'right' ? '-8px' : '0px',
        }}
      >
        {finalCells.map((cell, idx) => {
          const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
          const disabled = isDateDisabled?.(cell.date) ?? false;
          const isClickable = cell.isCurrentMonth && !disabled;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onDayClick(cell.date)}
              className={`
                h-8 w-8 mx-auto rounded-full flex items-center justify-center text-[14px] tracking-[-0.01em]
                transition-colors duration-150
                ${
                  !cell.isCurrentMonth
                    ? 'text-[#D6D6D6] cursor-default'
                    : disabled
                    ? 'text-[#D6D6D6] cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#F1F8FD] text-black hover:bg-[#E0F0FB]'
                    : 'text-black hover:bg-[#F5F5F5] active:bg-[#EBEBEB]'
                }
              `}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface FieldHalfProps {
  label: string;
  isFilled: boolean;
  isActive: boolean;
  parts: ReturnType<typeof formatDateParts> | null;
}

const FieldHalf: React.FC<FieldHalfProps> = ({ label, isFilled, isActive, parts }) => {
  return (
    <div className="relative h-full">
      <span
        className={`
          absolute left-0 pointer-events-none transition-all duration-200 ease-out
          tracking-[-0.01em] text-[#5C5C5C] origin-top-left whitespace-nowrap
          ${isFilled ? 'top-[8px] text-[12px]' : 'top-1/2 -translate-y-1/2 text-[14px]'}
        `}
      >
        {label}
      </span>
      <span
        className={`
          absolute left-0 bottom-[8px] flex items-center text-[14px] tracking-[-0.01em]
          transition-opacity duration-200 ease-out
          ${isFilled && parts ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden={!isFilled || !parts}
      >
        <span
          className={`
            inline-flex items-center rounded-[4px] -mx-1 px-1
            transition-colors duration-200
            ${isActive ? 'bg-[#CBE9FF]' : ''}
          `}
        >
          <span className="text-black">{parts?.dd ?? '00'}</span>
          <span className="text-black mx-1">/</span>
          <span className="text-black">{parts?.mm ?? '00'}</span>
          <span className="text-black mx-1">/</span>
          <span className="text-black">{parts?.yyyy ?? '0000'}</span>
        </span>
      </span>
    </div>
  );
};

const DateRangeField: React.FC<DateRangeFieldProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate,
}) => {
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => startDate ?? new Date());
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [popoverIn, setPopoverIn] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // When the external minDate changes, clear any values that are no longer valid.
  const minDateKey = minDate ? stripTime(minDate).getTime() : null;
  useEffect(() => {
    if (!minDate) return;
    if (startDate && !isAfter(startDate, minDate)) {
      onStartDateChange(null);
    }
    if (endDate && !isAfter(endDate, minDate)) {
      onEndDateChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDateKey]);

  useEffect(() => {
    if (activeField !== null) {
      setPopoverMounted(true);
      const t = setTimeout(() => setPopoverIn(true), 16);
      return () => clearTimeout(t);
    }
    setPopoverIn(false);
    const t = setTimeout(() => setPopoverMounted(false), POPOVER_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [activeField]);

  useEffect(() => {
    if (activeField === null) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeField]);

  useEffect(() => {
    if (activeField === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveField(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeField]);

  const dayAfter = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  const handleStartClick = () => {
    if (startDate === null) {
      let target = new Date();
      if (minDate && !isAfter(target, minDate)) {
        target = dayAfter(minDate);
      }
      onStartDateChange(target);
      setViewMonth(target);
    } else {
      setViewMonth(startDate);
    }
    setActiveField('start');
  };

  const handleEndClick = () => {
    if (endDate === null) {
      let target = new Date();
      if (startDate && isAfter(startDate, target)) target = startDate;
      if (minDate && !isAfter(target, minDate)) {
        target = dayAfter(minDate);
      }
      onEndDateChange(target);
      setViewMonth(target);
    } else {
      setViewMonth(endDate);
    }
    setActiveField('end');
  };

  const handleDaySelect = (date: Date) => {
    if (activeField === 'start') {
      onStartDateChange(date);
      if (endDate && isBefore(endDate, date)) {
        onEndDateChange(null);
      }
    } else if (activeField === 'end') {
      onEndDateChange(date);
    }
    setTimeout(() => setActiveField(null), 140);
  };

  const isContainerActive = activeField !== null;
  const startParts = startDate ? formatDateParts(startDate) : null;
  const endParts = endDate ? formatDateParts(endDate) : null;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`
          flex border rounded-[4px] overflow-hidden bg-white
          transition-colors duration-200 ease-out
          ${isContainerActive ? 'border-[#0366DD]' : 'border-[#D6D6D6] hover:border-[#1F1F1F]'}
        `}
      >
        <button
          type="button"
          onClick={handleStartClick}
          className="flex-1 min-w-0 h-[56px] px-4 relative text-left outline-none cursor-pointer"
        >
          <FieldHalf
            label="Start date"
            isFilled={startDate !== null}
            isActive={activeField === 'start'}
            parts={startParts}
          />
        </button>
        <div
          className={`w-px transition-colors duration-200 ${
            isContainerActive ? 'bg-[#0366DD]' : 'bg-[#D6D6D6]'
          }`}
        />
        <button
          type="button"
          onClick={handleEndClick}
          className="flex-1 min-w-0 h-[56px] px-4 relative text-left outline-none cursor-pointer"
        >
          <FieldHalf
            label="End date"
            isFilled={endDate !== null}
            isActive={activeField === 'end'}
            parts={endParts}
          />
        </button>
      </div>

      {popoverMounted && (
        <div
          className={`
            absolute left-0 right-0 z-20 origin-top
            transition-all ease-out
            ${popoverIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]'}
          `}
          style={{
            top: 'calc(100% + 8px)',
            transitionDuration: `${POPOVER_ANIMATION_MS}ms`,
          }}
        >
          <Calendar
            selectedDate={activeField === 'start' ? startDate : endDate}
            viewMonth={viewMonth}
            onDayClick={handleDaySelect}
            onMonthChange={setViewMonth}
            isDateDisabled={(date) => {
              if (minDate && !isAfter(date, minDate)) return true;
              if (activeField === 'end' && startDate && isBefore(date, startDate)) return true;
              return false;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DateRangeField;
