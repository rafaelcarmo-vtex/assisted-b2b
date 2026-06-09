import React, { useEffect, useRef, useState } from 'react';

interface CurrencyInputProps {
  /** Raw digits, e.g. "126887" displays as "$1,268.87". Empty displays as "$0.00". */
  digits: string;
  onChange: (digits: string) => void;
  /** Floating label shown when empty; rises when focused or filled. */
  label: string;
  ariaLabel?: string;
  className?: string;
}

/** Strips non-digits and leading zeros so storage stays canonical. */
export const cleanCentDigits = (raw: string): string =>
  raw.replace(/\D/g, '').replace(/^0+/, '');

/**
 * Cents-shifting formatter: digits fill from the right, always showing two
 * decimal places. "" → "0.00", "5" → "0.05", "126887" → "1,268.87".
 */
export const formatCentDigits = (digits: string): string => {
  const padded = (digits || '').padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const intNum = Number(intPart);
  return intNum.toLocaleString('en-US') + '.' + decPart;
};

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  digits,
  onChange,
  label,
  ariaLabel,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const isFilled = digits !== '';
  const isExpanded = isFocused || isFilled;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(cleanCentDigits(event.target.value));
  };

  // Keep cursor pinned to the end so cents-shifting feels natural even as
  // formatting characters appear or disappear during a keystroke.
  useEffect(() => {
    if (document.activeElement !== inputRef.current || !inputRef.current) return;
    const len = inputRef.current.value.length;
    try {
      inputRef.current.setSelectionRange(len, len);
    } catch {
      /* no-op */
    }
  }, [digits]);

  const moveCursorToEnd = () => {
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const len = inputRef.current.value.length;
      try {
        inputRef.current.setSelectionRange(len, len);
      } catch {
        /* no-op */
      }
    });
  };

  const handleWrapperClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative cursor-text ${className ?? ''}`}
      onClick={handleWrapperClick}
    >
      <span
        className={`
          absolute left-4 pointer-events-none transition-all duration-200 ease-out
          tracking-[-0.01em] text-[#5C5C5C] origin-top-left whitespace-nowrap
          ${isExpanded ? 'top-[8px] text-[12px]' : 'top-1/2 -translate-y-1/2 text-[14px]'}
        `}
      >
        {label}
      </span>

      <div
        className={`
          absolute left-4 right-4 bottom-[8px] flex items-center
          transition-opacity duration-200 ease-out
          ${isExpanded ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden={!isExpanded}
      >
        <span className="text-[14px] tracking-[-0.01em] text-[#5C5C5C] select-none mr-1">
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={formatCentDigits(digits)}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            moveCursorToEnd();
          }}
          onBlur={() => setIsFocused(false)}
          aria-label={ariaLabel ?? label}
          className={`
            flex-1 min-w-0 bg-transparent outline-none text-[14px] tracking-[-0.01em]
            transition-colors duration-150
            ${isFilled ? 'text-[#1F1F1F]' : 'text-[#5C5C5C]'}
          `}
        />
      </div>
    </div>
  );
};

export default CurrencyInput;
